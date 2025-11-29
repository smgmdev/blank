import { useState, useRef, useEffect } from "react";
import { useStore, Site } from "@/lib/store";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  Palette
} from "lucide-react";

export default function Editor() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const editorRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const editorImageInputRef = useRef<HTMLInputElement>(null);
  const userId = localStorage.getItem('userId');
  
  const [sites_user, setSitesUser] = useState<any[]>([]);
  const [step, setStep] = useState(1);
  const [isPublishing, setIsPublishing] = useState(false);
  const [isEditorEmpty, setIsEditorEmpty] = useState(true);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [categories, setCategories] = useState<any[]>([]);
  const [availableTags, setAvailableTags] = useState<any[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(false);
  const [loadingTags, setLoadingTags] = useState(false);
  
  const [selectedSiteId, setSelectedSiteId] = useState<string>("");
  const [formData, setFormData] = useState({
    title: "",
    slug: "",
    content: "",
    image: null as File | null,
    imagePreview: "",
    categories: [] as (string | number)[],
    tags: [] as (string | number)[],
    currentTag: "",
    seo: {
      focusKeyword: "",
      description: "",
      indexed: true
    }
  });

  // Fetch user's authenticated sites
  useEffect(() => {
    const fetchSites = async () => {
      if (!userId) return;
      try {
        const res = await fetch(`/api/users/${userId}/sites-with-auth`);
        if (res.ok) {
          const data = await res.json();
          setSitesUser(data.filter((s: any) => s.userIsConnected));
        }
      } catch (error) {
        console.error('Failed to fetch sites:', error);
      }
    };
    fetchSites();
  }, [userId]);

  // Fetch categories and tags when site changes
  useEffect(() => {
    const fetchCategoriesAndTags = async () => {
      if (!selectedSiteId || !userId) return;
      setLoadingCategories(true);
      setLoadingTags(true);
      try {
        const [catRes, tagRes] = await Promise.all([
          fetch(`/api/sites/${selectedSiteId}/categories?userId=${userId}`),
          fetch(`/api/sites/${selectedSiteId}/tags?userId=${userId}`)
        ]);
        
        if (catRes.ok) {
          const cats = await catRes.json();
          setCategories(cats);
        } else {
          console.error('Categories response:', catRes.status, await catRes.text());
        }
        if (tagRes.ok) {
          const tags = await tagRes.json();
          setAvailableTags(tags);
        } else {
          console.error('Tags response:', tagRes.status, await tagRes.text());
        }
      } catch (error) {
        console.error('Failed to fetch categories/tags:', error);
        toast({ variant: "destructive", title: "Error", description: "Failed to load categories and tags" });
      }
      setLoadingCategories(false);
      setLoadingTags(false);
    };
    fetchCategoriesAndTags();
  }, [selectedSiteId, userId]);

  const selectedSite = sites_user.find(s => s.id === selectedSiteId);
  const plugin = selectedSite?.seoPlugin || 'none';

  // Restore editor content when returning to step 1
  useEffect(() => {
    if (step === 1 && editorRef.current && formData.content) {
      editorRef.current.innerHTML = formData.content;
      // Update empty state
      const text = editorRef.current.innerText || editorRef.current.textContent || '';
      const cleanText = text.replace(/Start typing here\.\.\./, '').trim();
      setIsEditorEmpty(cleanText.length === 0);
    }
  }, [step]);

  const generateSlug = (title: string) => {
    return title
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
  };

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const title = e.target.value;
    setFormData({
      ...formData,
      title,
      slug: generateSlug(title)
    });
  };

  const handleImageDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      const file = files[0];
      if (file.type.startsWith('image/')) {
        setFormData({
          ...formData,
          image: file,
          imagePreview: URL.createObjectURL(file)
        });
        toast({
          title: "Image Uploaded",
          description: `"${file.name}" has been added as featured image.`
        });
      }
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.currentTarget.files;
    if (files && files.length > 0) {
      const file = files[0];
      setFormData({
        ...formData,
        image: file,
        imagePreview: URL.createObjectURL(file)
      });
    }
  };

  const handleEditorInput = () => {
    if (editorRef.current) {
      const text = editorRef.current.innerText || editorRef.current.textContent || '';
      const cleanText = text.replace(/Start typing here\.\.\./, '').trim();
      setIsEditorEmpty(cleanText.length === 0);
      setFormData({
        ...formData,
        content: editorRef.current.innerHTML
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
    // Navigate back to dashboard
    setLocation("/dashboard");
  };

  const handleSaveDraft = () => {
    toast({
      title: "Draft Saved",
      description: "Your article draft has been saved successfully."
    });
  };

  const handleAddTag = async (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && formData.currentTag.trim()) {
      e.preventDefault();
      const tagName = formData.currentTag.trim();
      
      if (formData.tags.includes(tagName)) {
        toast({ variant: "destructive", title: "Tag exists", description: "This tag is already added" });
        return;
      }

      try {
        // Try to create tag on WordPress if not exists
        const createRes = await fetch(`/api/sites/${selectedSiteId}/tags`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId, tagName })
        });

        if (createRes.ok) {
          const newTag = await createRes.json();
          setFormData({
            ...formData,
            tags: [...formData.tags, newTag.id],
            currentTag: ""
          });
          toast({ title: "Tag added", description: `"${tagName}" added to WordPress` });
        } else {
          throw new Error('Failed to create tag');
        }
      } catch (error) {
        console.error('Tag creation error:', error);
        toast({ variant: "destructive", title: "Error", description: "Failed to add tag" });
      }
    }
  };

  const removeTag = (tagToRemove: string | number) => {
    setFormData({
      ...formData,
      tags: formData.tags.filter(t => t !== tagToRemove)
    });
  };

  const applyFormat = (command: string, value?: string) => {
    document.execCommand(command, false, value);
    editorRef.current?.focus();
  };

  const isSeoComplete = () => {
    if (plugin === 'none') return true;
    if (plugin === 'aioseo' || plugin === 'rankmath' || plugin === 'yoast') {
      return formData.seo.focusKeyword.trim().length > 0;
    }
    return false;
  };

  const handleImageInsertClick = () => {
    editorImageInputRef.current?.click();
  };

  const handleEditorImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.currentTarget.files;
    if (files && files.length > 0) {
      const file = files[0];
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (event) => {
          const imgDataUrl = event.target?.result as string;
          if (editorRef.current) {
            const img = document.createElement('img');
            img.src = imgDataUrl;
            img.style.maxWidth = '100%';
            img.style.height = 'auto';
            img.style.borderRadius = '8px';
            img.style.margin = '8px 0';
            img.style.display = 'block';
            
            // Insert at cursor position
            const selection = window.getSelection();
            if (selection && selection.rangeCount > 0) {
              const range = selection.getRangeAt(0);
              range.insertNode(img);
              range.setEndAfter(img);
              selection.removeAllRanges();
              selection.addRange(range);
            } else {
              editorRef.current.appendChild(img);
            }
            
            // Trigger input event to update content
            handleEditorInput();
            toast({
              title: "Image Added",
              description: "Image inserted into your article."
            });
          }
        };
        reader.readAsDataURL(file);
      }
    }
    // Reset input
    e.currentTarget.value = '';
  };

  // Validation checks
  const getValidationErrors = () => {
    const errors = [];
    if (!formData.title) errors.push("Article title is required");
    if (isEditorEmpty) errors.push("Article content is required");
    if (formData.categories.length === 0) errors.push("At least one category must be selected");
    if (formData.tags.length === 0) errors.push("At least one tag is required");
    if (!formData.imagePreview) errors.push("Featured image is required");
    if (!selectedSiteId) errors.push("Destination site is required");
    if (plugin === 'aioseo' && !formData.seo.focusKeyword) errors.push("Focus keyword is required for AIOSEO");
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

    setIsPublishing(true);
    
    try {
      // Create article locally first
      const article = await (async () => {
        const res = await fetch('/api/articles', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId,
            title: formData.title,
            content: formData.content,
            status: 'draft'
          })
        });
        return res.json();
      })();

      // Publish to WordPress
      const publishRes = await fetch(`/api/articles/${article.id}/publish-to-site`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          siteId: selectedSiteId,
          userId,
          title: formData.title,
          content: formData.content,
          categories: formData.categories,
          tags: formData.tags
        })
      });

      if (!publishRes.ok) {
        throw new Error('Publishing failed');
      }

      setIsPublishing(false);
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
    <div className="max-w-4xl mx-auto space-y-8 pb-20">
      {/* Stepper */}
      <div className="flex items-center justify-between relative">
        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-0.5 bg-border -z-10" />
        {steps.map((s) => (
          <div key={s.num} className="flex flex-col items-center gap-2 bg-muted/30 px-2">
            <div className={`
              w-10 h-10 rounded-full flex items-center justify-center font-bold transition-colors
              ${step >= s.num ? 'bg-primary text-primary-foreground' : 'bg-background border border-border text-muted-foreground'}
            `}>
              {step > s.num ? <CheckCircle2 className="w-6 h-6" /> : s.num}
            </div>
            <span className={`text-xs font-medium ${step >= s.num ? 'text-foreground' : 'text-muted-foreground'}`}>
              {s.label}
            </span>
          </div>
        ))}
      </div>

      {/* Step 1: Content */}
      {step === 1 && (
        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
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
                    </div>
                  ) : (
                    <>
                      <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center mx-auto mb-4 group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                        <UploadCloud className="w-6 h-6" />
                      </div>
                      <p className="text-sm font-medium">Drag & drop or click to upload</p>
                      <p className="text-xs text-muted-foreground mt-1">Supports JPG, PNG, WEBP</p>
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
              </div>

              <div className="space-y-2">
                <Label>Content</Label>
                <div className="border border-border rounded-lg overflow-hidden">
                  {/* Advanced Editor Toolbar */}
                  <div className="bg-gradient-to-r from-muted to-muted/80 border-b border-border p-3 flex flex-wrap gap-2">
                    {/* Block & Font Size Group */}
                    <div className="flex gap-1 border-r border-border pr-2">
                      <select 
                        className="px-2 py-1 text-sm border border-border rounded hover:bg-background transition-colors"
                        onChange={(e) => applyFormat('formatBlock', e.target.value)}
                        title="Text style"
                      >
                        <option value="p">Paragraph</option>
                        <option value="h2">Heading 2</option>
                        <option value="h3">Heading 3</option>
                        <option value="h4">Heading 4</option>
                      </select>
                      
                      <select 
                        className="px-2 py-1 text-sm border border-border rounded hover:bg-background transition-colors"
                        onChange={(e) => applyFormat('fontSize', e.target.value)}
                        title="Font size"
                      >
                        <option value="1">Small</option>
                        <option value="3" selected>Normal</option>
                        <option value="5">Large</option>
                        <option value="7">Extra Large</option>
                      </select>
                    </div>

                    {/* Text Formatting Group */}
                    <div className="flex gap-1 border-r border-border pr-2">
                      <Button size="sm" variant="outline" onClick={() => applyFormat('bold')} title="Bold (Ctrl+B)" className="h-8 px-2">
                        <Bold className="w-4 h-4" />
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => applyFormat('italic')} title="Italic (Ctrl+I)" className="h-8 px-2">
                        <Italic className="w-4 h-4" />
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => applyFormat('underline')} title="Underline" className="h-8 px-2">
                        <u>U</u>
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => applyFormat('strikeThrough')} title="Strikethrough" className="h-8 px-2 text-xs">
                        <s>S</s>
                      </Button>
                    </div>

                    {/* Alignment Group */}
                    <div className="flex gap-1 border-r border-border pr-2">
                      <Button size="sm" variant="outline" onClick={() => applyFormat('justifyLeft')} title="Align Left" className="h-8 px-2">
                        <AlignLeft className="w-4 h-4" />
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => applyFormat('justifyCenter')} title="Align Center" className="h-8 px-2">
                        <AlignCenter className="w-4 h-4" />
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => applyFormat('justifyRight')} title="Align Right" className="h-8 px-2">
                        <AlignRight className="w-4 h-4" />
                      </Button>
                    </div>

                    {/* List & Link Group */}
                    <div className="flex gap-1 border-r border-border pr-2">
                      <Button size="sm" variant="outline" onClick={() => applyFormat('insertUnorderedList')} title="Bullet List" className="h-8 px-2">
                        <List className="w-4 h-4" />
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => applyFormat('insertOrderedList')} title="Numbered List" className="h-8 px-2">
                        1.
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => applyFormat('createLink', prompt('Enter URL:') || '')} title="Add Link" className="h-8 px-2">
                        <LinkIcon className="w-4 h-4" />
                      </Button>
                    </div>

                    {/* Color & Image Group */}
                    <div className="flex gap-1 border-r border-border pr-2">
                      <div className="flex items-center gap-1">
                        <input 
                          type="color" 
                          defaultValue="#000000"
                          onChange={(e) => applyFormat('foreColor', e.target.value)}
                          title="Text Color"
                          className="h-8 w-8 border border-border rounded cursor-pointer"
                        />
                      </div>
                      <div className="flex items-center gap-1">
                        <input 
                          type="color" 
                          defaultValue="#ffff00"
                          onChange={(e) => applyFormat('backColor', e.target.value)}
                          title="Highlight Color"
                          className="h-8 w-8 border border-border rounded cursor-pointer"
                        />
                      </div>
                    </div>

                    {/* Image Group */}
                    <div className="flex gap-1">
                      <Button size="sm" variant="outline" onClick={handleImageInsertClick} title="Insert Image" className="h-8 px-2">
                        <ImageIcon className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Hidden file input for editor images */}
                  <input 
                    ref={editorImageInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleEditorImageSelect}
                    className="hidden"
                  />
                  
                  {/* Rich Text Editor */}
                  <div
                    ref={editorRef}
                    contentEditable
                    suppressContentEditableWarning
                    onInput={handleEditorInput}
                    className="min-h-[400px] p-4 focus:outline-none font-[Helvetica,Arial,sans-serif] text-base leading-relaxed bg-white dark:bg-slate-950"
                    style={{ 
                      fontFamily: 'Helvetica, Arial, sans-serif',
                      color: '#1f2937'
                    }}
                    data-placeholder="Start typing here..."
                  />
                  <style>{`
                    [data-placeholder]:empty::before {
                      content: attr(data-placeholder);
                      color: #999;
                      font-style: italic;
                    }
                    [data-placeholder]:empty:focus::before {
                      content: "";
                    }
                  `}</style>
                </div>
                <p className="text-xs text-muted-foreground">Use the toolbar to format your text with headings, bold, italic, links, lists, and more.</p>
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
                    <div className="space-y-2 mt-4">
                      {categories.map((cat: any) => (
                        <div key={cat.id} className="flex items-center gap-3 p-2.5 rounded-lg border border-border hover:bg-muted/50 cursor-pointer transition-colors"
                          onClick={() => {
                            if (formData.categories.includes(cat.id)) {
                              setFormData({
                                ...formData,
                                categories: formData.categories.filter((c: any) => c !== cat.id)
                              });
                            } else {
                              setFormData({
                                ...formData,
                                categories: [...formData.categories, cat.id]
                              });
                            }
                          }}
                        >
                          <div className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-all ${
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
                          <Label htmlFor={`cat-${cat.id}`} className="font-normal cursor-pointer text-sm flex-1">{cat.name}</Label>
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
                        placeholder="Type tag name and press Enter to add..." 
                        value={formData.currentTag}
                        onChange={e => setFormData({...formData, currentTag: e.target.value})}
                        onKeyDown={handleAddTag}
                        className="mt-4"
                      />
                      {availableTags.length > 0 && formData.currentTag.trim() !== "" && (
                        <div className="text-xs text-muted-foreground mt-2 p-2 border border-border rounded bg-muted/30">
                          <p className="font-semibold mb-2">Matching tags:</p>
                          <div className="flex flex-wrap gap-1">
                            {availableTags
                              .filter((tag: any) => tag.name.toLowerCase().includes(formData.currentTag.toLowerCase()))
                              .slice(0, 5)
                              .map((tag: any) => (
                                <Badge key={tag.id} variant="outline" className="text-xs cursor-pointer hover:bg-primary/10"
                                  onClick={() => setFormData({...formData, tags: [...formData.tags, tag.id], currentTag: ""})}
                                >
                                  {tag.name}
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
                  <div className="w-full mt-4 p-3 border border-border rounded-lg bg-muted/30 min-h-12 flex flex-wrap gap-2 items-start content-start">
                    {formData.tags.map(tag => {
                      const tagName = typeof tag === 'number' 
                        ? availableTags.find((t: any) => t.id === tag)?.name || tag
                        : tag;
                      return (
                        <Badge key={tag} variant="secondary" className="gap-1 pr-1 text-xs" style={{maxWidth: '200px', wordBreak: 'break-word', whiteSpace: 'normal'}}>
                          <span style={{display: 'block', wordBreak: 'break-word'}}>
                            {tagName}
                          </span>
                          <button 
                            className="ml-1 cursor-pointer hover:bg-destructive/20 rounded-full p-0.5 flex-shrink-0"
                            onClick={() => removeTag(tag)}
                            data-testid="button-remove-tag"
                            type="button"
                          >
                            <Search className="w-3 h-3 rotate-45" />
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
                <Badge variant="outline" className="capitalize">{plugin === 'none' ? 'Default WP' : plugin}</Badge>
              </CardTitle>
              <CardDescription>
                Optimize your content using the connected site's SEO plugin.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Common SEO Title Field (All plugins) */}
              <div className="space-y-2">
                <Label>SEO Title (Auto-synced with Article Title)</Label>
                <Input 
                  value={formData.title}
                  disabled
                  className="bg-muted text-muted-foreground cursor-not-allowed"
                  placeholder="Auto-synced from article title"
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
                    <Label className="text-green-600 font-medium">AIOSEO Score</Label>
                    <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full bg-green-500 w-[85%]" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-green-600 font-medium">Focus Keyword *</Label>
                    <Input 
                      placeholder="Enter focus keyword for AIOSEO..." 
                      value={formData.seo.focusKeyword}
                      onChange={(e) => setFormData({...formData, seo: {...formData.seo, focusKeyword: e.target.value}})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Meta Description</Label>
                    <Input placeholder="Keep it under 160 characters..." 
                      value={formData.seo.description}
                      onChange={(e) => setFormData({...formData, seo: {...formData.seo, description: e.target.value}})}
                    />
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
            <CardContent className="space-y-6">
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
                    {plugin === 'none' ? 'Default WordPress' : plugin}
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

              <Separator />

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

              <Separator />

              {/* Bottom Row: Categories and Tags */}
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <Label className="text-xs text-muted-foreground uppercase tracking-wider">Categories</Label>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {formData.categories.length > 0 ? formData.categories.map(c => <Badge key={c} variant="outline" className="text-xs">{c}</Badge>) : <span className="text-sm text-muted-foreground">-</span>}
                  </div>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground uppercase tracking-wider">Tags</Label>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {formData.tags.length > 0 ? formData.tags.map(t => <Badge key={t} variant="secondary" className="text-xs">{t}</Badge>) : <span className="text-sm text-muted-foreground">-</span>}
                  </div>
                </div>
              </div>
              
              <Separator />
              
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
      <div className="fixed bottom-0 left-0 w-full bg-background border-t border-border p-4 z-30 md:pl-64 md:z-20">
        <div className="max-w-4xl mx-auto flex items-center gap-2 px-4 md:px-0 flex-col sm:flex-row justify-end">
          <div className="flex gap-2 w-full sm:w-auto">
            <Button 
              variant="outline" 
              onClick={() => setShowCancelConfirm(true)}
              className="gap-2 hover:bg-red-500 hover:text-white hover:border-red-500 transition-all duration-200 flex-1 sm:flex-none sm:w-auto justify-center"
            >
              <span className="sm:hidden">Cancel</span>
              <span className="hidden sm:inline">Cancel Article</span>
            </Button>
            
            <Button 
              variant="outline"
              onClick={handleSaveDraft}
              className="gap-2 hover:bg-black hover:text-white transition-all duration-200 flex-1 sm:flex-none sm:w-auto justify-center"
            >
              <Save className="w-4 h-4" /> <span className="sm:inline">Save Draft</span>
            </Button>
          </div>
          
          <div className="flex gap-2 w-full sm:w-auto">
            <Button 
              variant="outline" 
              onClick={handleBack} 
              disabled={step === 1}
              className="gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent flex-1 hover:bg-black hover:text-white transition-all duration-200"
            >
              <ChevronLeft className="w-4 h-4" /> Back
            </Button>
            {step < 4 ? (
              <Button 
                onClick={handleNext} 
                className="gap-2 group flex-1 hover:bg-black hover:text-white transition-all duration-200"
                variant="outline"
              >
                Next <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-200" />
              </Button>
            ) : (
              <Button 
                onClick={handlePublish} 
                disabled={isPublishing || !isFormValid} 
                className="gap-2 min-w-[140px] flex-1"
                title={!isFormValid ? "Please fill in all required fields" : ""}
              >
                {isPublishing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                Publish Now
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
