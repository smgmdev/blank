import { useState, useRef } from "react";
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
  AlertCircle
} from "lucide-react";

// Mock Data for Categories based on sites
const MOCK_CATEGORIES = {
  'default': ['Uncategorized', 'News', 'Updates'],
  '1': ['Tech', 'Startups', 'Venture Capital', 'Gadgets'],
  '2': ['Breakfast', 'Lunch', 'Dinner', 'Dessert', 'Vegan'],
  '3': ['Projects', 'Case Studies', 'Thoughts'],
};

export default function Editor() {
  const { sites, addArticle } = useStore();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const editorRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const connectedSites = sites.filter(s => s.isConnected);
  
  const [step, setStep] = useState(1);
  const [isPublishing, setIsPublishing] = useState(false);
  const [isEditorEmpty, setIsEditorEmpty] = useState(true);
  
  const [selectedSiteId, setSelectedSiteId] = useState<string>(connectedSites[0]?.id || "");
  const [formData, setFormData] = useState({
    title: "",
    slug: "",
    content: "",
    image: null as File | null,
    imagePreview: "",
    category: "",
    tags: [] as string[],
    currentTag: "",
    seo: {
      focusKeyword: "",
      description: "",
      indexed: true
    }
  });

  const selectedSite = sites.find(s => s.id === selectedSiteId);
  const plugin = selectedSite?.seoPlugin || 'none';
  const categories = MOCK_CATEGORIES[selectedSiteId as keyof typeof MOCK_CATEGORIES] || MOCK_CATEGORIES['default'];

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

  const handleAddTag = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && formData.currentTag) {
      e.preventDefault();
      if (!formData.tags.includes(formData.currentTag)) {
        setFormData({
          ...formData,
          tags: [...formData.tags, formData.currentTag],
          currentTag: ""
        });
      }
    }
  };

  const removeTag = (tagToRemove: string) => {
    setFormData({
      ...formData,
      tags: formData.tags.filter(t => t !== tagToRemove)
    });
  };

  const applyFormat = (command: string, value?: string) => {
    document.execCommand(command, false, value);
    editorRef.current?.focus();
  };

  // Validation checks
  const getValidationErrors = () => {
    const errors = [];
    if (!formData.title) errors.push("Article title is required");
    if (isEditorEmpty) errors.push("Article content is required");
    if (!formData.category) errors.push("Category must be selected");
    if (!selectedSiteId) errors.push("Destination site is required");
    if (plugin === 'aioseo' && !formData.seo.focusKeyword) errors.push("Focus keyword is required for AIOSEO");
    if (plugin === 'rankmath' && !formData.seo.focusKeyword) errors.push("Focus keyword is required for Rank Math");
    return errors;
  };

  const validationErrors = getValidationErrors();
  const isFormValid = validationErrors.length === 0;

  const handlePublish = () => {
    if (!isFormValid) {
      toast({ 
        variant: "destructive", 
        title: "Cannot Publish", 
        description: "Please fill in all required fields." 
      });
      return;
    }

    setIsPublishing(true);
    
    setTimeout(() => {
      addArticle({
        siteId: selectedSiteId,
        title: formData.title,
        content: formData.content,
        category: formData.category || "Uncategorized",
        tags: formData.tags,
        status: 'published'
      });

      setIsPublishing(false);
      toast({
        title: "Published Successfully!",
        description: `Article "${formData.title}" is now live on ${selectedSite?.name}`,
      });
      
      setLocation("/my-articles");
    }, 2000);
  };

  if (connectedSites.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-center space-y-4">
        <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center">
          <FileText className="w-8 h-8 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-medium">No Connected Sites</h3>
        <p className="text-muted-foreground max-w-sm">
          You need to connect to at least one WordPress site in the Dashboard before you can write articles.
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
                    <SelectValue placeholder="Select site" />
                  </SelectTrigger>
                  <SelectContent>
                    {connectedSites.map(site => (
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
                  className="text-lg font-medium"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="slug">Slug (Auto-generated)</Label>
                <Input 
                  id="slug"
                  value={formData.slug}
                  disabled
                  className="bg-muted text-muted-foreground cursor-not-allowed"
                  placeholder="auto-generated-from-title"
                />
                <p className="text-xs text-muted-foreground">The URL-friendly version of your title. Auto-updated as you change the title.</p>
              </div>

              <div className="space-y-2">
                <Label>Featured Image</Label>
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
                    {/* Text Style Group */}
                    <div className="flex gap-1 border-r border-border pr-2">
                      <select 
                        className="px-2 py-1 text-sm border border-border rounded hover:bg-background transition-colors"
                        onChange={(e) => applyFormat('formatBlock', e.target.value)}
                      >
                        <option value="p">Paragraph</option>
                        <option value="h2">Heading 2</option>
                        <option value="h3">Heading 3</option>
                        <option value="h4">Heading 4</option>
                      </select>
                      
                      <select 
                        className="px-2 py-1 text-sm border border-border rounded hover:bg-background transition-colors"
                        onChange={(e) => applyFormat('fontSize', e.target.value)}
                      >
                        <option value="1">Small</option>
                        <option value="3" selected>Normal</option>
                        <option value="5">Large</option>
                        <option value="7">Extra Large</option>
                      </select>
                    </div>

                    {/* Formatting Group */}
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

                    {/* List & Link Group */}
                    <div className="flex gap-1">
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
                  </div>
                  
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
              <div className="space-y-2">
                <Label>Category</Label>
                <Select 
                  value={formData.category} 
                  onValueChange={v => setFormData({...formData, category: v})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map(cat => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">Categories fetched from {selectedSite?.name}</p>
              </div>

              <div className="space-y-2">
                <Label>Tags</Label>
                <Input 
                  placeholder="Type tag and press Enter..." 
                  value={formData.currentTag}
                  onChange={e => setFormData({...formData, currentTag: e.target.value})}
                  onKeyDown={handleAddTag}
                />
                <div className="flex flex-wrap gap-2 mt-3">
                  {formData.tags.map(tag => (
                    <Badge key={tag} variant="secondary" className="gap-1 pr-1">
                      {tag}
                      <div 
                        className="cursor-pointer hover:bg-destructive/20 rounded-full p-0.5"
                        onClick={() => removeTag(tag)}
                      >
                        <Search className="w-3 h-3 rotate-45" />
                      </div>
                    </Badge>
                  ))}
                  {formData.tags.length === 0 && (
                    <span className="text-xs text-muted-foreground italic">No tags added yet.</span>
                  )}
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
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <Label className="text-xs text-muted-foreground uppercase tracking-wider">Destination</Label>
                    <div className="font-medium flex items-center gap-2 mt-1">
                      <Globe className="w-4 h-4 text-primary" />
                      {selectedSite?.name}
                      <span className="text-xs text-muted-foreground font-normal">({selectedSite?.url})</span>
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground uppercase tracking-wider">Title</Label>
                    <div className="font-medium text-lg mt-1">{formData.title || "Untitled Article"}</div>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground uppercase tracking-wider">Slug</Label>
                    <div className="font-mono text-sm mt-1 text-muted-foreground">{formData.slug}</div>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground uppercase tracking-wider">Category</Label>
                    <div className="mt-1"><Badge variant="outline">{formData.category || "Uncategorized"}</Badge></div>
                  </div>
                </div>
                <div className="space-y-4">
                  <div>
                    <Label className="text-xs text-muted-foreground uppercase tracking-wider">Tags</Label>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {formData.tags.length > 0 ? formData.tags.map(t => <Badge key={t} variant="secondary" className="text-xs">{t}</Badge>) : <span className="text-sm text-muted-foreground">-</span>}
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground uppercase tracking-wider">SEO Plugin</Label>
                    <div className="mt-1 font-medium capitalize">{plugin}</div>
                  </div>
                  {plugin === 'aioseo' && (
                    <div>
                      <Label className="text-xs text-muted-foreground uppercase tracking-wider">Indexing</Label>
                      <div className="mt-1">
                        <Badge className={formData.seo.indexed ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"}>
                          {formData.seo.indexed ? "Indexed" : "Not Indexed"}
                        </Badge>
                      </div>
                    </div>
                  )}
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
      <div className="fixed bottom-0 left-0 w-full bg-background border-t border-border p-4 z-20 md:pl-64">
        <div className="max-w-4xl mx-auto flex items-center justify-between px-4 md:px-0">
          <Button 
            variant="outline" 
            onClick={handleBack} 
            disabled={step === 1}
            className="gap-2"
          >
            <ChevronLeft className="w-4 h-4" /> Back
          </Button>
          
          <div className="flex gap-2">
            {step < 4 ? (
              <Button onClick={handleNext} className="gap-2">
                Next Step <ChevronRight className="w-4 h-4" />
              </Button>
            ) : (
              <Button 
                onClick={handlePublish} 
                disabled={isPublishing || !isFormValid} 
                className="gap-2 min-w-[140px]"
                title={!isFormValid ? "Please fill in all required fields" : ""}
              >
                {isPublishing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                Publish Now
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
