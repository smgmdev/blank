import { useState, useRef, useEffect } from "react";
import { useStore, Site } from "@/lib/store";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SimpleEditor } from "@/components/simple-editor";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { 
  Loader2, 
  Send, 
  Save, 
  FileText, 
  Search, 
  CheckCircle2, 
  ChevronRight,
  ChevronLeft,
  UploadCloud,
  Globe,
  Bold,
  Italic,
  List,
  Link as LinkIcon,
  AlertCircle,
  Image as ImageIcon,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Palette,
  X
} from "lucide-react";

export default function Editor() {
  const { toast } = useToast();
  const [location, setLocation] = useLocation();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const userId = localStorage.getItem('userId');
  const { isPublishing, setIsPublishing } = useStore();

  // Validation functions for each step
  const getMissingFieldsStep1 = () => {
    const missing = [];
    if (!formData.title.trim()) missing.push("Article Title");
    if (!formData.imagePreview) missing.push("Featured Image");
    if (formData.imagePreview && !formData.imageCaption.trim()) missing.push("Image Caption");
    if (isEditorEmpty || !formData.content.trim()) missing.push("Content");
    return missing;
  };

  const getMissingFieldsStep2 = () => {
    const missing = [];
    if (formData.categories.length === 0) missing.push("Categories");
    if (formData.tags.length === 0) missing.push("Tags");
    return missing;
  };

  const getMissingFieldsStep3 = () => {
    const missing = [];
    if (!formData.seo.focusKeyword.trim()) missing.push("Focus Keyword");
    if (!formData.seo.description.trim()) missing.push("Meta Description");
    return missing;
  };
  // Properly extract articleId from URL, handling query strings
  const articleId = (() => {
    const pathOnly = location.split('?')[0]; // Remove query params
    const id = pathOnly.split('/').pop() || '';
    return (id && id !== 'editor' && id !== 'undefined') ? id : '';
  })();
  
  const [sites_user, setSitesUser] = useState<any[]>([]);
  const [loadingSites, setLoadingSites] = useState(true);
  const [step, setStep] = useState(1);
  const [isEditorEmpty, setIsEditorEmpty] = useState(true);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [categories, setCategories] = useState<any[]>([]);
  const [availableTags, setAvailableTags] = useState<any[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(false);
  const [loadingTags, setLoadingTags] = useState(false);
  const [isEditingDraft, setIsEditingDraft] = useState(false);
  
  const [selectedSiteId, setSelectedSiteId] = useState<string>("");
  const [formData, setFormData] = useState({
    title: "",
    slug: "",
    content: "",
    image: null as File | null,
    imagePreview: "",
    imageCaption: "",
    categories: [] as (string | number)[],
    tags: [] as (string | number)[],
    currentTag: "",
    seo: {
      focusKeyword: "",
      description: "",
      indexed: true
    }
  });

  // Fetch user's authenticated sites and draft article if editing
  useEffect(() => {
    const fetchData = async () => {
      if (!userId) return;
      setLoadingSites(true);
      try {
        const res = await fetch(`/api/sites?action=user-sites&userId=${userId}`);
        if (res.ok) {
          const data = await res.json();
          setSitesUser(data.filter((s: any) => s.userIsConnected));
        }

        // Load draft article if editing
        if (articleId && articleId !== '' && articleId !== 'undefined') {
          try {
            const articleRes = await fetch(`/api/content?type=articles&articleId=${articleId}`);
            if (!articleRes.ok) {
              console.warn('Failed to fetch article:', articleRes.status, articleId);
              return;
            }
            const article = await articleRes.json();
            // Load ALL article data into form
            setIsEditingDraft(true);
            setSelectedSiteId(article.siteId || "");
            setFormData({
              title: article.title || "",
              slug: article.title ? article.title.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-').trim() : "",
              content: article.content || "",
              image: null,
              imagePreview: article.featuredImageUrl || "",
              imageCaption: article.imageCaption || "",
              categories: Array.isArray(article.categories) ? article.categories : [],
              tags: Array.isArray(article.tags) ? article.tags.map((t: any) => typeof t === 'object' ? t.id : t) : [],
              currentTag: "",
              seo: {
                focusKeyword: (article.seo?.focusKeyword) || "",
                description: (article.seo?.description) || "",
                indexed: article.seo?.indexed !== false
              }
            });
            console.log("[Draft Load] Restored article:", { title: article.title, content: article.content, categories: article.categories, tags: article.tags, imageCaption: article.imageCaption, seo: article.seo });
            // Mark editor as not empty
            if (article.content) {
              setIsEditorEmpty(false);
            }
          } catch (error) {
            console.error('Failed to fetch draft article:', error);
          }
        }
      } catch (error) {
        console.error('Failed to fetch sites:', error);
      } finally {
        setLoadingSites(false);
      }
    };
    fetchData();
  }, [userId, articleId]);

  // Cache for categories/tags to avoid refetching
  const [categoriesCache, setCategoriesCache] = useState<Record<string, any[]>>({});
  const [tagsCache, setTagsCache] = useState<Record<string, any[]>>({});


  // Load categories and tags when site is selected or draft is loaded
  useEffect(() => {
    if (selectedSiteId && !loadingCategories) {
      loadCategoriesAndTags();
    }
  }, [selectedSiteId]);

  // Lazy load categories and tags ONLY when needed (called manually, not on mount)
  const loadCategoriesAndTags = async () => {
    if (!selectedSiteId || !userId) return;
    
    // Check cache first
    if (categoriesCache[selectedSiteId] && tagsCache[selectedSiteId]) {
      setCategories(categoriesCache[selectedSiteId]);
      setAvailableTags(tagsCache[selectedSiteId]);
      return;
    }
    
    setLoadingCategories(true);
    setLoadingTags(true);
    try {
      const [catRes, tagRes] = await Promise.all([
        fetch(`/api/content?type=categories&userId=${userId}&siteId=${selectedSiteId}`),
        fetch(`/api/content?type=tags&userId=${userId}&siteId=${selectedSiteId}`)
      ]);
      
      if (catRes.ok) {
        const cats = await catRes.json();
        setCategories(cats);
        setCategoriesCache(prev => ({ ...prev, [selectedSiteId]: cats }));
      }
      if (tagRes.ok) {
        const tags = await tagRes.json();
        setAvailableTags(tags);
        setTagsCache(prev => ({ ...prev, [selectedSiteId]: tags }));
      }
    } catch (error) {
      console.error('Failed to fetch categories/tags:', error);
    } finally {
      setLoadingCategories(false);
      setLoadingTags(false);
    }
  };

  const selectedSite = sites_user.find(s => s.id === selectedSiteId);
  const plugin = selectedSite?.seoPlugin || 'none';


  const generateSlug = (title: string) => {
    return title
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
  };

  // Common stop words and verbs to exclude from focus keyword
  const stopWords = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'from', 'as', 'is', 'was', 'are', 'be', 'been', 'is', 'this', 'that', 'it', 'which', 'who', 'what', 'when', 'where', 'why', 'how', 'he', 'she', 'me', 'you', 'we', 'they', 'them', 'their']);
  
  // Common verbs, modal verbs, and adjectives to exclude - we want only nouns for focus keywords
  const verbWords = new Set(['make', 'get', 'go', 'know', 'take', 'see', 'come', 'think', 'say', 'try', 'ask', 'need', 'feel', 'become', 'leave', 'put', 'mean', 'keep', 'let', 'begin', 'seem', 'help', 'talk', 'turn', 'start', 'show', 'hear', 'play', 'run', 'move', 'like', 'live', 'believe', 'hold', 'bring', 'happen', 'write', 'provide', 'sit', 'stand', 'lose', 'pay', 'meet', 'include', 'continue', 'set', 'learn', 'change', 'lead', 'understand', 'watch', 'follow', 'stop', 'create', 'speak', 'read', 'allow', 'add', 'spend', 'grow', 'open', 'walk', 'win', 'offer', 'remember', 'love', 'consider', 'appear', 'buy', 'wait', 'serve', 'die', 'send', 'expect', 'build', 'stay', 'fall', 'cut', 'reach', 'kill', 'remain', 'suggest', 'raise', 'pass', 'sell', 'require', 'report', 'decide', 'pull', 'explain', 'develop', 'carry', 'break', 'receive', 'agree', 'support', 'hit', 'produce', 'eat', 'cover', 'catch', 'draw', 'choose', 'cause', 'follow', 'climb', 'claim', 'arrive', 'hurt', 'doing', 'done', 'called', 'being', 'having', 'going', 'coming', 'trying', 'making', 'taking', 'giving', 'showing', 'using', 'looking', 'getting', 'seeing', 'finding', 'can', 'could', 'may', 'might', 'must', 'shall', 'should', 'will', 'would', 'be', 'have', 'has', 'had', 'do', 'does', 'did', 'am', 'was', 'were', 'new', 'old', 'good', 'bad', 'best', 'worst', 'beautiful', 'ugly', 'big', 'small', 'large', 'little', 'nice', 'great', 'amazing', 'wonderful', 'terrible', 'awful', 'excellent', 'poor', 'high', 'low', 'long', 'short', 'fast', 'slow', 'hot', 'cold', 'warm', 'cool', 'wet', 'dry', 'clean', 'dirty', 'bright', 'dark', 'light', 'heavy', 'easy', 'hard', 'simple', 'complex', 'easy', 'difficult', 'strong', 'weak', 'thick', 'thin', 'wide', 'narrow', 'deep', 'shallow', 'happy', 'sad', 'angry', 'calm', 'loud', 'quiet', 'full', 'empty', 'thick', 'thin', 'round', 'flat', 'sharp', 'dull', 'soft', 'hard', 'rough', 'smooth', 'fine', 'coarse', 'rich', 'poor', 'common', 'rare', 'usual', 'strange', 'normal', 'weird', 'similar', 'different', 'same', 'other', 'unique', 'special', 'certain', 'possible', 'able', 'unable', 'real', 'false', 'true', 'young', 'adult', 'real', 'fake', 'true', 'false', 'right', 'wrong', 'correct', 'incorrect', 'proper', 'improper', 'natural', 'artificial', 'public', 'private', 'free', 'busy']);

  // Global trending SEO keywords (nouns) - high-value words used when no good keyword found
  const trendingWords = ['guide', 'tips', 'strategy', 'benefits', 'review', 'solution', 'method', 'process', 'tools', 'software', 'app', 'service', 'platform', 'system', 'analysis', 'comparison', 'tutorial', 'resource', 'template', 'framework', 'pattern', 'technique', 'approach', 'feature', 'implementation', 'example', 'case', 'study', 'practice', 'training', 'course'];

  const isNoun = (word: string): boolean => {
    // Filter out verbs and stop words
    if (stopWords.has(word) || verbWords.has(word)) {
      return false;
    }
    // Exclude common verb endings
    if (word.endsWith('ing') || word.endsWith('ed') || word.endsWith('ize') || word.endsWith('ise')) {
      return false;
    }
    return true;
  };

  const extractFocusKeyword = (title: string, content: string): string => {
    if (!title || !content) return '';
    
    // Extract nouns from title (excluding stop words and verbs)
    const titleWords = title
      .toLowerCase()
      .split(/\s+/)
      .filter(word => word.length > 2)
      .map(word => word.replace(/[^\w]/g, ''))
      .filter(word => isNoun(word));

    // Get first paragraph from content (strip HTML)
    const firstParagraph = content
      .replace(/<[^>]*>/g, ' ')
      .split(/\n\n/)[0]
      .toLowerCase();

    // Find first title noun that also appears in first paragraph
    for (const word of titleWords) {
      if (firstParagraph.includes(word)) {
        return word;
      }
    }

    // Fallback: if we have nouns, use first one
    if (titleWords.length > 0) {
      return titleWords[0];
    }

    // Final fallback: use trending word from title (nouns only)
    const trendingInTitle = title.toLowerCase().split(/\s+/).find(word => 
      trendingWords.includes(word.replace(/[^\w]/g, ''))
    );
    if (trendingInTitle) {
      return trendingInTitle.replace(/[^\w]/g, '');
    }

    return '';
  };

  const generateMetaDescription = (content: string, focusKeyword: string): string => {
    if (!content) return '';
    
    // Strip HTML and get first sentence or ~160 chars
    let text = content.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
    
    // Try to get first sentence
    const sentences = text.split(/[.!?]+/);
    let description = sentences[0];

    // Ensure it includes focus keyword if we have one
    if (focusKeyword && !description.toLowerCase().includes(focusKeyword)) {
      description = sentences[0]; // Use first sentence as is
    }

    // Trim to ~160 characters
    if (description.length > 160) {
      description = description.substring(0, 160).trim() + '...';
    }

    return description;
  };

  // Auto-generate SEO fields when title or content changes
  useEffect(() => {
    if (plugin === 'aioseo' && formData.title && formData.content) {
      const keyword = extractFocusKeyword(formData.title, formData.content);
      const metaDesc = generateMetaDescription(formData.content, keyword);
      
      if (keyword !== formData.seo.focusKeyword || metaDesc !== formData.seo.description) {
        setFormData(prev => ({
          ...prev,
          seo: {
            ...prev.seo,
            focusKeyword: keyword,
            description: metaDesc
          }
        }));
      }
    }
  }, [formData.title, formData.content, plugin]);

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const title = e.target.value;
    setFormData({
      ...formData,
      title,
      slug: generateSlug(title)
    });
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        console.log("Image converted to base64, length:", (reader.result as string).length);
        resolve(reader.result as string);
      };
      reader.onerror = error => {
        console.error("FileReader error:", error);
        reject(error);
      };
    });
  };

  const handleImageDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      const file = files[0];
      if (file.type.startsWith('image/')) {
        fileToBase64(file).then((base64) => {
          console.log("Setting image preview, base64 length:", base64.length);
          setFormData(prevData => ({
            ...prevData,
            image: file,
            imagePreview: base64
          }));
          toast({
            title: "Image Uploaded",
            description: `"${file.name}" has been added as featured image.`
          });
        }).catch(err => {
          console.error("Image upload error:", err);
          toast({
            variant: "destructive",
            title: "Image Error",
            description: "Failed to process image"
          });
        });
      }
    }
  };

  const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

  const compressImage = (file: File, maxWidth = 1200, maxHeight = 800, quality = 0.85): Promise<File> => {
    return new Promise((resolve, reject) => {
      // Check file size
      if (file.size > MAX_FILE_SIZE) {
        reject(new Error(`File size (${(file.size / 1024 / 1024).toFixed(2)}MB) exceeds maximum of 10MB`));
        return;
      }

      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          let width = img.width;
          let height = img.height;
          
          // Calculate new dimensions
          if (width > maxWidth || height > maxHeight) {
            const aspectRatio = width / height;
            if (width > height) {
              width = maxWidth;
              height = Math.round(width / aspectRatio);
            } else {
              height = maxHeight;
              width = Math.round(height * aspectRatio);
            }
          }
          
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);
          
          canvas.toBlob((blob) => {
            if (blob) {
              const compressedFile = new File([blob], file.name, { type: 'image/jpeg' });
              console.log(`[Image] Compressed: ${(file.size / 1024 / 1024).toFixed(2)}MB → ${(compressedFile.size / 1024 / 1024).toFixed(2)}MB`);
              resolve(compressedFile);
            } else {
              reject(new Error('Compression failed'));
            }
          }, 'image/jpeg', quality);
        };
        img.onerror = () => reject(new Error('Failed to load image'));
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
    });
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.currentTarget.files;
    if (files && files.length > 0) {
      const file = files[0];
      console.log("File selected:", file.name, file.size);
      
      compressImage(file).then((compressedFile) => {
        fileToBase64(compressedFile).then((base64) => {
          console.log("Setting image from file input, base64 length:", base64.length);
          setFormData(prevData => ({
            ...prevData,
            image: compressedFile,
            imagePreview: base64
          }));
        });
      }).catch(err => {
        console.error("Image compression error:", err);
        toast({
          variant: "destructive",
          title: "Image Error",
          description: "Failed to process image: " + err.message
        });
      });
    }
  };


  const handleNext = () => {
    if (step === 1 && (!formData.title || !selectedSiteId || isEditorEmpty)) {
      toast({ 
        variant: "destructive", 
        title: "Missing Fields", 
        description: "Please select a site, enter a title, and write some content." 
      });
      return;
    }
    // Lazy load categories/tags when moving to step 2
    if (step === 1) {
      loadCategoriesAndTags();
    }
    setStep(s => s + 1);
  };

  const handleBack = () => setStep(s => s - 1);

  const handleCancel = () => {
    setShowCancelConfirm(false);
    // Reset form data
    setFormData({
      title: "",
      slug: "",
      content: "",
      image: null,
      imagePreview: "",
      categories: [],
      tags: [],
      currentTag: "",
      seo: {
        focusKeyword: "",
        description: "",
        indexed: true
      }
    });
    setSelectedSiteId("");
    setStep(1);
    setIsEditorEmpty(true);
    setIsEditingDraft(false);
    // Navigate back to my articles if editing, dashboard if new
    setLocation(isEditingDraft ? "/my-articles" : "/dashboard");
  };

  const handleSaveDraft = async () => {
    if (!formData.title || isEditorEmpty) {
      toast({ 
        variant: "destructive", 
        title: "Missing Fields", 
        description: "Please enter a title and write some content." 
      });
      return;
    }

    try {
      // Store image - either base64 data URL or HTTP URL
      const imageUrl = (formData.imagePreview && (formData.imagePreview.startsWith('data:') || formData.imagePreview.startsWith('http'))) 
        ? formData.imagePreview 
        : null;

      const draftData = {
        title: formData.title,
        content: formData.content,
        status: 'draft',
        categories: formData.categories.length > 0 ? formData.categories : null,
        tags: formData.tags.length > 0 ? formData.tags : null,
        featuredImageUrl: imageUrl,
        imageCaption: formData.imageCaption || null,
        seo: {
          focusKeyword: formData.seo?.focusKeyword || "",
          description: formData.seo?.description || "",
          indexed: formData.seo?.indexed !== false
        }
      };
      
      console.log("[Draft Save] Full data being saved:", draftData);

      if (isEditingDraft && articleId) {
        // Update existing draft - save ALL form data
        const res = await fetch(`/api/content?type=articles&articleId=${articleId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(draftData)
        });

        if (!res.ok) {
          throw new Error('Failed to save draft');
        }

        toast({
          title: "Draft Updated",
          description: "Your article draft has been updated successfully."
        });
        setLocation("/my-articles?tab=drafts");
      } else {
        // Create new draft - save ALL form data
        const res = await fetch('/api/content?type=articles', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId,
            siteId: selectedSiteId,
            ...draftData
          })
        });

        if (!res.ok) {
          throw new Error('Failed to create draft');
        }

        toast({
          title: "Draft Saved",
          description: "Your article draft has been saved successfully."
        });
        setLocation("/my-articles?tab=drafts");
      }
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Save Failed",
        description: error.message || "Could not save draft"
      });
    }
  };

  const handleAddTag = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && formData.currentTag.trim()) {
      e.preventDefault();
      const tagName = formData.currentTag.trim();
      
      // Max 3 tags limit
      if (formData.tags.length >= 3) {
        toast({ variant: "destructive", title: "Limit reached", description: "Maximum 3 tags allowed" });
        return;
      }
      
      // Look up tag in availableTags to get numeric ID
      const existingTag = availableTags.find((t: any) => 
        t.name.toLowerCase() === tagName.toLowerCase()
      );

      // Use numeric ID if exists, otherwise use tag name (will be created on WordPress during publishing)
      const tagValue = existingTag?.id || tagName;

      if (formData.tags.includes(tagValue)) {
        toast({ variant: "destructive", title: "Tag exists", description: "This tag is already added" });
        return;
      }

      // Add tag (either numeric ID or new tag name)
      setFormData({
        ...formData,
        tags: [...formData.tags, tagValue],
        currentTag: ""
      });
      const isNew = !existingTag;
      toast({ 
        title: "Tag added", 
        description: isNew ? `"${tagName}" will be created when you publish` : `"${tagName}" added successfully` 
      });
    }
  };

  const removeTag = (tagToRemove: string | number) => {
    setFormData({
      ...formData,
      tags: formData.tags.filter(t => t !== tagToRemove)
    });
  };

  const handleEditorChange = (content: string) => {
    setFormData({ ...formData, content });
  };

  const handleImageInsert = (base64: string) => {
    toast({
      title: "Image Inserted",
      description: "Image added to your article. You can drag to reposition and resize."
    });
  };

  const handleEditorEmpty = (isEmpty: boolean) => {
    setIsEditorEmpty(isEmpty);
  };

  const isSeoComplete = () => {
    if (plugin === 'none') return true;
    if (plugin === 'aioseo' || plugin === 'rankmath' || plugin === 'yoast') {
      return formData.seo.focusKeyword.trim().length > 0;
    }
    return false;
  };

  // Validation checks
  const getValidationErrors = () => {
    const errors = [];
    if (!formData.title) errors.push("Article title is required");
    if (isEditorEmpty) errors.push("Article content is required");
    if (formData.categories.length === 0) errors.push("At least one category must be selected");
    if (formData.tags.length === 0) errors.push("At least one tag is required");
    if (!formData.imagePreview) errors.push("Featured image is required");
    if (!formData.imageCaption) errors.push("Image caption is required");
    if (!selectedSiteId) errors.push("Destination site is required");
    if (plugin === 'aioseo' && !formData.seo.focusKeyword) errors.push("Focus keyword is required for AIO SEO PRO");
    if (plugin === 'rankmath' && !formData.seo.focusKeyword) errors.push("Focus keyword is required for Rank Math");
    return errors;
  };

  const validationErrors = getValidationErrors();
  const isFormValid = validationErrors.length === 0;

  const handlePublish = async () => {
    if (!isFormValid) {
      toast({ 
        variant: "destructive", 
        title: "Cannot Publish", 
        description: "Please fill in all required fields." 
      });
      return;
    }

    console.log("Publishing with image base64 length:", formData.imagePreview?.length || 0);
    setIsPublishing(true);
    
    try {
      // Send tags as-is (mix of string names and numeric IDs)
      // Backend will handle creating string tags and using numeric tag IDs
      console.log("[Publish] Sending tags:", formData.tags);

      // Create article locally first
      const article = await (async () => {
        const res = await fetch('/api/content?type=articles', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId,
            siteId: selectedSiteId,
            title: formData.title,
            content: formData.content,
            status: 'draft'
          })
        });
        return res.json();
      })();

      // Publish to WordPress
      const publishRes = await fetch(`/api/content?type=publish&articleId=${article.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          siteId: selectedSiteId,
          userId,
          title: formData.title,
          content: formData.content,
          categories: formData.categories,
          tags: formData.tags && formData.tags.length > 0 ? formData.tags : [],
          featuredImageBase64: formData.imagePreview,
          imageCaption: formData.imageCaption
        })
      });

      if (!publishRes.ok) {
        const errorText = await publishRes.text();
        throw new Error(`Publishing failed: ${errorText}`);
      }

      const publishResult = await publishRes.json();
      console.log("Publish result:", publishResult);

      // Store wpLink in localStorage for immediate display
      if (publishResult.wpLink) {
        localStorage.setItem(`wpLink_${article.id}`, publishResult.wpLink);
      }

      setIsPublishing(false);
      
      // Delete draft article if it exists (after successful publish)
      if (isEditingDraft && articleId) {
        try {
          await fetch(`/api/content?type=articles&articleId=${articleId}`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' }
          });
        } catch (e) {
          console.warn("Failed to delete draft after publishing:", e);
        }
      }
      
      toast({
        title: "Published Successfully!",
        description: `Article "${formData.title}" is now live on ${selectedSite?.name}`,
      });
      
      setLocation("/my-articles");
    } catch (error: any) {
      setIsPublishing(false);
      toast({
        variant: "destructive",
        title: "Publishing Failed",
        description: error.message || "Could not publish article"
      });
    }
  };

  // Loading skeleton similar to LinkedIn style
  if (loadingSites) {
    return (
      <div className="max-w-4xl mx-auto space-y-8 pb-20">
        {/* Skeleton Progress Bar */}
        <div className="space-y-4">
          <div className="h-1.5 bg-muted rounded-full" />
          <div className="flex items-center justify-between">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex flex-col items-center gap-2 flex-1">
                <div className="w-8 h-8 rounded-full bg-muted animate-pulse" />
                <div className="h-2 w-12 bg-muted rounded animate-pulse" />
              </div>
            ))}
          </div>
        </div>

        {/* Skeleton Card Content */}
        <div className="border rounded-lg p-6 space-y-6">
          <div className="space-y-3">
            <div className="h-6 w-48 bg-muted rounded animate-pulse" />
            <div className="h-4 w-80 bg-muted rounded animate-pulse" />
          </div>

          <div className="space-y-4">
            <div className="h-4 w-24 bg-muted rounded animate-pulse" />
            <div className="h-10 w-full bg-muted rounded-lg animate-pulse" />
          </div>

          <div className="space-y-4">
            <div className="h-4 w-20 bg-muted rounded animate-pulse" />
            <div className="h-24 w-full bg-muted rounded-lg animate-pulse" />
          </div>

          <div className="flex gap-3 justify-end pt-4">
            <div className="h-10 w-24 bg-muted rounded animate-pulse" />
            <div className="h-10 w-24 bg-muted rounded animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  if (sites_user.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-center space-y-4">
        <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center">
          <FileText className="w-8 h-8 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-medium">No Connected Sites</h3>
        <p className="text-muted-foreground max-w-sm">
          You need to authenticate to at least one WordPress site in the Dashboard before you can write articles.
        </p>
        <Button asChild>
          <a href="/dashboard">Go to Dashboard</a>
        </Button>
      </div>
    );
  }

  const steps = [
    { num: 1, label: "Content" },
    { num: 2, label: "Categorization" },
    { num: 3, label: "SEO" },
    { num: 4, label: "Review" }
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-4 pb-20">
      {/* Modern Tab-Style Progress Indicator */}
      <div className="flex gap-2 border-b border-slate-200">
        {steps.map((s) => (
          <button
            key={s.num}
            onClick={() => setStep(s.num)}
            className={`px-4 py-3 text-sm font-medium transition-all duration-300 border-b-2 ${
              step === s.num
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      {/* Step 1: Content */}
      {step === 1 && (
        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
          <Card>
            <CardHeader>
              <CardTitle>New Article</CardTitle>
              <CardDescription>Choose where to publish and write your content with rich formatting.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label>Destination Site</Label>
                <Select value={selectedSiteId} onValueChange={setSelectedSiteId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a site" />
                  </SelectTrigger>
                  <SelectContent>
                    {sites_user.map((site: any) => (
                      <SelectItem key={site.id} value={site.id}>{site.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="title">Article Title</Label>
                <Input 
                  id="title"
                  placeholder="Enter a catchy title..." 
                  value={formData.title}
                  onChange={handleTitleChange}
                  className="text-sm"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="slug">Slug (Auto-generated)</Label>
                <Input 
                  id="slug"
                  value={formData.slug}
                  disabled
                  className="bg-muted text-muted-foreground cursor-not-allowed text-sm"
                  placeholder="auto-generated"
                />
                <p className="text-xs text-muted-foreground">URL-friendly version</p>
              </div>

              <div className="space-y-2">
                <Label>Featured Image <span className="text-destructive">*</span></Label>
                <div 
                  className="border-2 border-dashed border-border rounded-lg p-8 text-center hover:bg-muted/50 transition-colors cursor-pointer group"
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                  }}
                  onDrop={handleImageDrop}
                  onClick={() => fileInputRef.current?.click()}
                >
                  {formData.imagePreview ? (
                    <div className="space-y-2">
                      <img src={formData.imagePreview} alt="Preview" className="w-32 h-32 object-cover mx-auto rounded" />
                      <p className="text-sm font-medium text-green-600">Image selected: {formData.image?.name}</p>
                      <p className="text-xs text-muted-foreground">{formData.image && `${(formData.image.size / 1024 / 1024).toFixed(2)} MB`}</p>
                    </div>
                  ) : (
                    <>
                      <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center mx-auto mb-4 group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                        <UploadCloud className="w-6 h-6" />
                      </div>
                      <p className="text-sm font-medium">Drag & drop or click to upload</p>
                      <p className="text-xs text-muted-foreground mt-1">Supports JPG, PNG, WEBP (Max 10MB)</p>
                    </>
                  )}
                  <input 
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                </div>

                {formData.imagePreview && (
                  <div className="space-y-2">
                    <Label>Image Caption <span className="text-destructive">*</span></Label>
                    <Input 
                      placeholder="Add caption for your image"
                      value={formData.imageCaption}
                      onChange={(e) => setFormData({...formData, imageCaption: e.target.value})}
                      data-testid="input-image-caption"
                    />
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label>Content</Label>
                <SimpleEditor
                  content={formData.content}
                  onChange={handleEditorChange}
                  onEmptyChange={handleEditorEmpty}
                />
                <p className="text-xs text-muted-foreground">Use the toolbar above to format your content. Click the image icon to insert photos.</p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Step 2: Categorization */}
      {step === 2 && (
        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
          <Card>
            <CardHeader>
              <CardTitle>Organize Content</CardTitle>
              <CardDescription>Select categories and tags for better discoverability.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid md:grid-cols-[1fr_1fr] gap-6">
                <div className="space-y-3">
                  <Label>Categories <span className="text-destructive">*</span></Label>
                  {loadingCategories ? (
                    <div className="flex flex-col items-center justify-center py-8 space-y-2">
                      <div className="animate-spin">
                        <Loader2 className="w-5 h-5 text-muted-foreground" />
                      </div>
                      <p className="text-xs text-muted-foreground">Loading categories...</p>
                    </div>
                  ) : categories.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-4">No categories available</p>
                  ) : (
                    <div className="space-y-0.5 mt-4">
                      {categories.map((cat: any) => (
                        <div key={cat.id} className="flex items-center gap-2 p-2 rounded border border-transparent hover:border-border hover:bg-muted/30 cursor-pointer transition-colors"
                          onClick={() => {
                            if (formData.categories.includes(cat.id)) {
                              setFormData({
                                ...formData,
                                categories: formData.categories.filter((c: any) => c !== cat.id)
                              });
                            } else {
                              // Max 2 categories limit
                              if (formData.categories.length >= 2) {
                                toast({ variant: "destructive", title: "Limit reached", description: "Maximum 2 categories allowed" });
                                return;
                              }
                              setFormData({
                                ...formData,
                                categories: [...formData.categories, cat.id]
                              });
                            }
                          }}
                        >
                          <div className={`w-5 h-5 rounded border border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                            formData.categories.includes(cat.id) 
                              ? 'bg-primary border-primary' 
                              : 'border-border hover:border-primary'
                          }`}>
                            {formData.categories.includes(cat.id) && (
                              <svg className="w-3 h-3 text-primary-foreground" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
                            )}
                          </div>
                          <Label htmlFor={`cat-${cat.id}`} className="font-normal cursor-pointer text-sm flex-1 m-0">{cat.name}</Label>
                        </div>
                      ))}
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground">Categories from {selectedSite?.name}</p>
                </div>

                <div className="space-y-2">
                  <Label>Tags <span className="text-destructive">*</span></Label>
                  {loadingTags ? (
                    <div className="flex flex-col items-center justify-center py-6 space-y-2 border border-border rounded-lg bg-muted/30">
                      <div className="animate-spin">
                        <Loader2 className="w-5 h-5 text-muted-foreground" />
                      </div>
                      <p className="text-xs text-muted-foreground">Loading tags...</p>
                    </div>
                  ) : (
                    <>
                      <Input 
                        placeholder="Type tag name and press Enter..." 
                        value={formData.currentTag}
                        onChange={e => setFormData({...formData, currentTag: e.target.value})}
                        onKeyDown={handleAddTag}
                        className="mt-4 text-sm"
                      />
                      {availableTags.length > 0 && formData.currentTag.trim() !== "" && (
                        <div className="text-xs text-muted-foreground mt-2 p-2 border border-border rounded bg-muted/30">
                          <p className="font-semibold mb-2">Matching tags:</p>
                          <div className="flex flex-wrap gap-1">
                            {availableTags
                              .filter((tag: any) => tag.name.toLowerCase().includes(formData.currentTag.toLowerCase()))
                              .slice(0, 5)
                              .map((tag: any) => (
                                <Badge key={tag.id} variant="outline" className="text-xs cursor-pointer hover:bg-primary/10" style={{maxWidth: '150px', wordBreak: 'break-word', whiteSpace: 'normal', display: 'inline-flex'}}
                                  onClick={() => {
                                    if (formData.tags.length >= 3) {
                                      toast({ variant: "destructive", title: "Limit reached", description: "Maximum 3 tags allowed" });
                                      return;
                                    }
                                    setFormData({...formData, tags: [...formData.tags, tag.id], currentTag: ""});
                                  }}
                                >
                                  <span style={{wordBreak: 'break-word'}}>{tag.name}</span>
                                </Badge>
                              ))}
                            {availableTags.filter((tag: any) => tag.name.toLowerCase().includes(formData.currentTag.toLowerCase())).length === 0 && (
                              <p className="text-xs italic text-muted-foreground">No matching tags. Press Enter to create new.</p>
                            )}
                          </div>
                        </div>
                      )}
                    </>
                  )}
                  <div className="w-full mt-3 p-1.5 border border-border rounded-lg bg-muted/30 min-h-7 flex flex-wrap gap-1 items-start content-start">
                    {formData.tags.map(tag => {
                      const tagName = typeof tag === 'number' 
                        ? availableTags.find((t: any) => t.id === tag)?.name || tag
                        : tag;
                      return (
                        <Badge key={tag} variant="secondary" className="gap-1 pr-1 text-xs group" style={{maxWidth: '200px', wordBreak: 'break-word', whiteSpace: 'normal'}}>
                          <span style={{display: 'block', wordBreak: 'break-word'}}>
                            {tagName}
                          </span>
                          <button 
                            className="ml-1 cursor-pointer hover:bg-red-500 hover:text-white rounded-full p-0.5 flex-shrink-0 transition-colors opacity-60 hover:opacity-100"
                            onClick={() => removeTag(tag)}
                            data-testid="button-remove-tag"
                            type="button"
                            title="Remove tag"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </Badge>
                      );
                    })}
                    {formData.tags.length === 0 && (
                      <span className="text-xs text-muted-foreground italic py-2">No tags added yet.</span>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Step 3: SEO */}
      {step === 3 && (
        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
          <Card className="border-blue-100 dark:border-blue-900 overflow-hidden">
            <div className={`h-1.5 w-full ${
              plugin === 'rankmath' ? 'bg-purple-500' :
              plugin === 'aioseo' ? 'bg-green-500' :
              plugin === 'yoast' ? 'bg-amber-500' : 'bg-gray-300'
            }`} />
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                SEO Configuration
                <Badge variant="outline" className="capitalize">
                  {plugin === 'none' ? 'Default WP' : plugin === 'aioseo' ? 'AIO SEO PRO' : plugin}
                </Badge>
              </CardTitle>
              <CardDescription>
                Optimize your content using the connected site's SEO plugin.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Common SEO Title Field (All plugins) */}
              <div className="space-y-3">
                <Label>SEO Title (Auto-synced with Article Title)</Label>
                <textarea 
                  value={formData.title}
                  disabled
                  className="w-full p-2 border border-border rounded-lg bg-muted text-muted-foreground cursor-not-allowed resize-none overflow-hidden text-sm"
                  placeholder="Auto-synced from article title"
                  rows={1}
                  style={{ height: 'auto', minHeight: '2rem' }}
                />
                <p className="text-xs text-muted-foreground">This is automatically set to match your article title and cannot be edited separately.</p>
              </div>

              {/* Plugin-Specific Fields */}
              {plugin === 'rankmath' && (
                <>
                  <div className="bg-purple-50 dark:bg-purple-900/10 p-4 rounded-lg flex items-center gap-3">
                    <div className="text-3xl font-bold text-purple-600">76<span className="text-sm font-normal text-muted-foreground">/100</span></div>
                    <div className="text-sm text-muted-foreground">Rank Math Score <br/> Good but could be better.</div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-purple-600 font-medium">Focus Keyword *</Label>
                    <Input 
                      placeholder="Main keyword to rank for..." 
                      value={formData.seo.focusKeyword}
                      onChange={(e) => setFormData({...formData, seo: {...formData.seo, focusKeyword: e.target.value}})}
                    />
                  </div>
                </>
              )}

              {plugin === 'aioseo' && (
                <>
                  <div className="space-y-2">
                    <Label className="text-green-600 font-medium">AI Generated Focus Keyword *</Label>
                    <Input 
                      disabled
                      placeholder="Auto-generated from title and content..." 
                      value={formData.seo.focusKeyword}
                      className="bg-muted text-muted-foreground cursor-not-allowed"
                    />
                    <p className="text-xs text-muted-foreground">Automatically extracted from your article title and first paragraph for optimal SEO.</p>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-green-600 font-medium">AI Generated Meta Description</Label>
                    <textarea 
                      disabled
                      placeholder="Auto-generated from content..." 
                      value={formData.seo.description}
                      className="w-full p-3 border border-border rounded-lg bg-muted text-muted-foreground cursor-not-allowed resize-none overflow-hidden text-sm"
                      rows={3}
                      style={{ height: 'auto', minHeight: '5rem' }}
                    />
                    <p className="text-xs text-muted-foreground">Automatically generated from your first paragraph (max 160 characters).</p>
                  </div>
                  <div className="flex items-center gap-2 pt-2 border-t">
                    <Checkbox 
                      id="indexed" 
                      checked={formData.seo.indexed}
                      onCheckedChange={(checked) => setFormData({...formData, seo: {...formData.seo, indexed: checked as boolean}})}
                    />
                    <Label htmlFor="indexed" className="font-normal cursor-pointer">Index this page in search engines</Label>
                  </div>
                </>
              )}

              {plugin === 'yoast' && (
                <>
                  <div className="flex gap-2 mb-4">
                    <span className="flex items-center gap-2 text-sm"><div className="w-3 h-3 rounded-full bg-green-500" /> SEO Analysis: Good</span>
                    <span className="flex items-center gap-2 text-sm"><div className="w-3 h-3 rounded-full bg-orange-500" /> Readability: OK</span>
                  </div>
                  <div className="space-y-2">
                    <Label>Focus Keyphrase</Label>
                    <Input 
                      placeholder="Focus keyword for Yoast..." 
                      value={formData.seo.focusKeyword}
                      onChange={(e) => setFormData({...formData, seo: {...formData.seo, focusKeyword: e.target.value}})}
                    />
                  </div>
                </>
              )}

              {plugin === 'none' && (
                <div className="text-sm text-muted-foreground text-center py-8 bg-muted/20 rounded-lg border border-dashed">
                  <Search className="w-8 h-8 mx-auto mb-2 opacity-20" />
                  No advanced SEO plugin detected on this site.<br/>
                  Standard WordPress fields will be used.
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Step 4: Review */}
      {step === 4 && (
        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
          {/* Missing Fields Warning */}
          {!isFormValid && (
            <Card className="border-amber-200 bg-amber-50 dark:bg-amber-950/20">
              <CardContent className="pt-6">
                <div className="flex gap-3">
                  <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-amber-900 dark:text-amber-100 mb-2">Missing Required Fields</h4>
                    <ul className="space-y-1 text-sm text-amber-800 dark:text-amber-200">
                      {validationErrors.map((error, i) => (
                        <li key={i}>• {error}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Review & Publish</CardTitle>
              <CardDescription>Double check everything before going live.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* Top Row: Destination and SEO Plugin */}
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <Label className="text-xs text-muted-foreground uppercase tracking-wider">Destination</Label>
                  <div className="font-medium flex items-center gap-2 mt-1">
                    <Globe className="w-4 h-4 text-primary" />
                    {selectedSite?.name}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">{selectedSite?.url}</div>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground uppercase tracking-wider">SEO Plugin</Label>
                  <div className="mt-1 font-medium capitalize flex items-center gap-2">
                    {plugin === 'none' ? 'Default WordPress' : plugin === 'aioseo' ? 'AIO SEO PRO' : plugin === 'rankmath' ? 'Rank Math' : plugin === 'yoast' ? 'Yoast SEO' : plugin}
                    {isSeoComplete() && <CheckCircle2 className="w-4 h-4 text-green-500" />}
                  </div>
                  {plugin === 'aioseo' && (
                    <div className="mt-2">
                      <Badge className={formData.seo.indexed ? "bg-green-100 text-green-800 text-xs" : "bg-gray-100 text-gray-800 text-xs"}>
                        {formData.seo.indexed ? "Indexed" : "Not Indexed"}
                      </Badge>
                    </div>
                  )}
                </div>
              </div>

              <Separator className="my-2" />

              {/* Featured Image Preview */}
              {formData.imagePreview && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Label className="text-xs text-muted-foreground uppercase tracking-wider">Featured Image</Label>
                    {formData.imageCaption && <CheckCircle2 className="w-4 h-4 text-green-500" />}
                  </div>
                  <div className="mt-2 rounded-lg border overflow-hidden bg-muted/20 p-2 max-w-xs">
                    <img src={formData.imagePreview} alt="Featured" className="w-full h-auto rounded" />
                  </div>
                  {formData.imageCaption && (
                    <div className="text-xs text-green-600 font-medium flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> Caption: {formData.imageCaption}
                    </div>
                  )}
                </div>
              )}

              {formData.imagePreview && <Separator className="my-2" />}

              {/* Middle Row: Title and Slug */}
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <Label className="text-xs text-muted-foreground uppercase tracking-wider">Title</Label>
                  <div className="font-medium text-lg mt-1">{formData.title || "Untitled Article"}</div>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground uppercase tracking-wider">Slug</Label>
                  <div className="font-mono text-sm mt-1 text-muted-foreground">{formData.slug}</div>
                </div>
              </div>

              <Separator className="my-2" />

              {/* Bottom Row: Categories and Tags */}
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <Label className="text-xs text-muted-foreground uppercase tracking-wider">Categories</Label>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {formData.categories.length > 0 ? formData.categories.map(catId => {
                      const catName = categories.find((c: any) => c.id === catId)?.name || `Category ${catId}`;
                      return <Badge key={catId} variant="outline" className="text-xs">{catName}</Badge>;
                    }) : <span className="text-sm text-muted-foreground">-</span>}
                  </div>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground uppercase tracking-wider">Tags</Label>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {formData.tags.length > 0 ? formData.tags.map(t => <Badge key={t} variant="secondary" className="text-xs">{t}</Badge>) : <span className="text-sm text-muted-foreground">-</span>}
                  </div>
                </div>
              </div>
              
              <Separator className="my-2" />
              
              <div className="space-y-2">
                <Label>Content Preview</Label>
                <div className="bg-muted/30 p-4 rounded-lg border text-sm max-h-80 overflow-y-auto">
                  {formData.content ? (
                    <div 
                      className="prose prose-sm max-w-none dark:prose-invert" 
                      dangerouslySetInnerHTML={{ __html: formData.content }}
                      style={{ fontFamily: 'Helvetica, Arial, sans-serif' }}
                    />
                  ) : (
                    <p className="italic text-muted-foreground">No content written yet...</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}


      {/* Footer Controls */}
      <div className="fixed bottom-0 left-0 w-full bg-background border-t border-border p-4 z-50 md:pl-64">
        <div className="max-w-4xl mx-auto flex items-center gap-2 px-4 md:px-0 flex-col sm:flex-row justify-end">
          <div className="flex gap-2 w-full sm:w-auto">
            <Button 
              variant="outline" 
              onClick={() => setShowCancelConfirm(true)}
              disabled={isPublishing}
              className="gap-2 hover:bg-blue-50 hover:border-blue-600 hover:text-blue-600 flex-1 sm:flex-none sm:w-auto justify-center disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span className="sm:hidden">Cancel</span>
              <span className="hidden sm:inline">Cancel Article</span>
            </Button>
            
            <Button 
              variant="outline"
              onClick={handleSaveDraft}
              disabled={isPublishing}
              className="gap-2 hover:bg-blue-50 hover:border-blue-600 hover:text-blue-600 flex-1 sm:flex-none sm:w-auto justify-center disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span className="sm:inline">Save Draft</span>
            </Button>
          </div>
          
          <div className="flex gap-2 w-full sm:w-auto">
            <Button 
              variant="outline" 
              onClick={handleBack} 
              disabled={step === 1 || isPublishing}
              className="gap-2 hover:bg-blue-50 hover:border-blue-600 hover:text-blue-600 disabled:opacity-50 disabled:cursor-not-allowed flex-1"
            >
              <ChevronLeft className="w-4 h-4" /> Back
            </Button>
            {step < 4 ? (
              <Button 
                onClick={handleNext} 
                disabled={isPublishing}
                className="gap-2 group flex-1 hover:bg-blue-50 hover:border-blue-600 hover:text-blue-600"
                variant="outline"
              >
                Next <ChevronRight className="w-4 h-4" />
              </Button>
            ) : (
              <Button 
                onClick={handlePublish} 
                disabled={isPublishing || !isFormValid} 
                className="gap-2 min-w-[140px] flex-1"
                title={!isFormValid ? "Please fill in all required fields" : ""}
              >
                {isPublishing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                {isPublishing ? "Publishing..." : "Publish Now"}
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Cancel Confirmation Dialog */}
      <Dialog open={showCancelConfirm} onOpenChange={setShowCancelConfirm}>
        <DialogContent className="animate-fade-in w-full sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Cancel Article?</DialogTitle>
            <DialogDescription>
              Are you sure you want to cancel? All unsaved changes will be lost.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setShowCancelConfirm(false)}
            >
              No, Keep Editing
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleCancel}
            >
              Yes, Cancel Article
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
