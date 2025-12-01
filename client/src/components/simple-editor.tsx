import { useState, useRef, useEffect } from 'react';
import { Button } from './ui/button';
import { Bold, Italic, Underline, List, ListOrdered, Heading2, Link, Undo2, Redo2, AlignLeft, AlignCenter, AlignRight, Image as ImageIcon, Play, Trash2 } from 'lucide-react';
import { Input } from './ui/input';
import { Label } from './ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from './ui/dialog';

interface SimpleEditorProps {
  content: string;
  onChange: (content: string) => void;
  onEmptyChange: (isEmpty: boolean) => void;
}

export function SimpleEditor({ content, onChange, onEmptyChange }: SimpleEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [videoUrl, setVideoUrl] = useState('');
  const [showVideoDialog, setShowVideoDialog] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [selectedImage, setSelectedImage] = useState<HTMLImageElement | null>(null);
  const [isResizing, setIsResizing] = useState(false);
  const [resizeStart, setResizeStart] = useState({ x: 0, width: 0 });

  useEffect(() => {
    if (editorRef.current && !isInitialized) {
      editorRef.current.innerHTML = content || '';
      setHistory([content || '']);
      setHistoryIndex(0);
      setIsInitialized(true);
      setupImageListeners();
    }
  }, [isInitialized, content]);

  const setupImageListeners = () => {
    if (!editorRef.current) return;
    const images = editorRef.current.querySelectorAll('img');
    images.forEach(img => {
      img.style.cursor = 'pointer';
    });
  };

  const handleImageClick = (e: Event) => {
    e.stopPropagation();
    const img = e.target as HTMLImageElement;
    
    // Remove border from previously selected image
    if (selectedImage && selectedImage !== img) {
      selectedImage.style.border = 'none';
      removeResizeHandle();
    }
    
    setSelectedImage(img);
    img.style.border = '2px solid #3b82f6';
    img.style.borderRadius = '4px';
    addResizeHandle(img);
  };

  const addResizeHandle = (img: HTMLImageElement) => {
    removeResizeHandle();
    
    const handle = document.createElement('div');
    handle.className = 'resize-handle';
    handle.style.position = 'absolute';
    handle.style.width = '16px';
    handle.style.height = '16px';
    handle.style.backgroundColor = '#3b82f6';
    handle.style.border = '2px solid white';
    handle.style.borderRadius = '2px';
    handle.style.cursor = 'se-resize';
    handle.style.top = '-8px';
    handle.style.right = '-8px';
    handle.style.zIndex = '1000';
    handle.style.boxShadow = '0 2px 4px rgba(0,0,0,0.2)';
    
    const wrapper = document.createElement('div');
    wrapper.style.position = 'relative';
    wrapper.style.display = 'inline-block';
    wrapper.className = 'image-wrapper';
    
    img.parentNode?.insertBefore(wrapper, img);
    wrapper.appendChild(img);
    wrapper.appendChild(handle);
    
    handle.addEventListener('mousedown', handleResizeStart);
  };

  const removeResizeHandle = () => {
    const handle = document.querySelector('.resize-handle');
    if (handle) {
      handle.removeEventListener('mousedown', handleResizeStart);
      handle.remove();
    }
  };

  const handleResizeStart = (e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!selectedImage) return;
    
    setResizeStart({
      x: e.clientX,
      width: selectedImage.offsetWidth
    });
    setIsResizing(true);
  };

  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!selectedImage) return;
      
      const deltaX = e.clientX - resizeStart.x;
      const newWidth = Math.max(100, resizeStart.width + deltaX);
      selectedImage.style.width = newWidth + 'px';
      selectedImage.style.height = 'auto';
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      if (editorRef.current) {
        updateContent(editorRef.current.innerHTML);
      }
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing, resizeStart, selectedImage]);

  const updateContent = (newContent: string) => {
    onChange(newContent);
    const isEmpty = !newContent || newContent === '' || newContent.replace(/<[^>]*>/g, '').trim() === '';
    onEmptyChange(isEmpty);
    
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(newContent);
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  };

  const execCommand = (command: string, value?: string) => {
    document.execCommand(command, false, value);
    if (editorRef.current) {
      updateContent(editorRef.current.innerHTML);
    }
  };

  const handleUndo = () => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      if (editorRef.current) {
        editorRef.current.innerHTML = history[newIndex];
        onChange(history[newIndex]);
        setupImageListeners();
        setSelectedImage(null);
      }
    }
  };

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      setHistoryIndex(newIndex);
      if (editorRef.current) {
        editorRef.current.innerHTML = history[newIndex];
        onChange(history[newIndex]);
        setupImageListeners();
        setSelectedImage(null);
      }
    }
  };

  const handleImageInsert = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.currentTarget.files?.[0];
    if (file && editorRef.current) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = `<img src="${event.target?.result}" style="max-width: 100%; height: auto; margin: 10px 0; border-radius: 6px; cursor: pointer;" onclick="void(0);" />`;
        document.execCommand('insertHTML', false, img);
        if (editorRef.current) {
          updateContent(editorRef.current.innerHTML);
          setupImageListeners();
        }
      };
      reader.readAsDataURL(file);
    }
    e.currentTarget.value = '';
  };

  const handleAddVideo = () => {
    if (!videoUrl.trim() || !editorRef.current) return;

    let embedCode = '';
    
    if (videoUrl.includes('youtube.com') || videoUrl.includes('youtu.be')) {
      const videoId = videoUrl.includes('youtu.be') 
        ? videoUrl.split('youtu.be/')[1] 
        : videoUrl.split('v=')[1];
      embedCode = `<div style="margin: 20px 0;"><iframe width="100%" height="400" src="https://www.youtube.com/embed/${videoId}" frameborder="0" allowfullscreen></iframe></div>`;
    }
    else if (videoUrl.includes('vimeo.com')) {
      const videoId = videoUrl.split('vimeo.com/')[1];
      embedCode = `<div style="margin: 20px 0;"><iframe src="https://player.vimeo.com/video/${videoId}" width="100%" height="400" frameborder="0" allowfullscreen></iframe></div>`;
    }

    if (embedCode && editorRef.current) {
      document.execCommand('insertHTML', false, embedCode);
      updateContent(editorRef.current.innerHTML);
      setVideoUrl('');
      setShowVideoDialog(false);
    }
  };

  const alignImage = (alignment: 'left' | 'center' | 'right') => {
    if (!selectedImage) return;
    
    const wrapper = selectedImage.closest('.image-wrapper') || selectedImage.parentElement;
    if (!wrapper) return;
    
    wrapper.style.textAlign = alignment;
    if (alignment === 'left') {
      wrapper.style.marginRight = 'auto';
    } else if (alignment === 'center') {
      wrapper.style.marginLeft = 'auto';
      wrapper.style.marginRight = 'auto';
      wrapper.style.display = 'block';
    } else if (alignment === 'right') {
      wrapper.style.marginLeft = 'auto';
    }
    
    if (editorRef.current) {
      updateContent(editorRef.current.innerHTML);
    }
  };

  const deleteImage = () => {
    if (!selectedImage) return;
    const wrapper = selectedImage.closest('.image-wrapper');
    if (wrapper) {
      wrapper.remove();
    } else {
      selectedImage.remove();
    }
    setSelectedImage(null);
    if (editorRef.current) {
      updateContent(editorRef.current.innerHTML);
    }
  };

  return (
    <div className="border border-border rounded-lg overflow-hidden bg-white dark:bg-slate-950">
      <div className="bg-muted p-2 border-b border-border flex flex-wrap gap-1">
        <Button size="sm" variant="outline" onClick={() => execCommand('bold')} title="Bold" className="h-8 px-2">
          <Bold className="w-4 h-4" />
        </Button>
        <Button size="sm" variant="outline" onClick={() => execCommand('italic')} title="Italic" className="h-8 px-2">
          <Italic className="w-4 h-4" />
        </Button>
        <Button size="sm" variant="outline" onClick={() => execCommand('underline')} title="Underline" className="h-8 px-2">
          <Underline className="w-4 h-4" />
        </Button>
        <div className="w-px h-6 bg-border" />
        <Button size="sm" variant="outline" onClick={() => execCommand('formatBlock', 'h2')} title="Heading" className="h-8 px-2">
          <Heading2 className="w-4 h-4" />
        </Button>
        <Button size="sm" variant="outline" onClick={() => execCommand('insertUnorderedList')} title="Bullet List" className="h-8 px-2">
          <List className="w-4 h-4" />
        </Button>
        <Button size="sm" variant="outline" onClick={() => execCommand('insertOrderedList')} title="Numbered List" className="h-8 px-2">
          <ListOrdered className="w-4 h-4" />
        </Button>
        <div className="w-px h-6 bg-border" />
        <Button size="sm" variant="outline" onClick={() => execCommand('createLink', prompt('Enter URL') || '')} title="Link" className="h-8 px-2">
          <Link className="w-4 h-4" />
        </Button>
        <Button size="sm" variant="outline" onClick={() => imageInputRef.current?.click()} title="Image" className="h-8 px-2">
          <ImageIcon className="w-4 h-4" />
        </Button>
        <Button size="sm" variant="outline" onClick={() => setShowVideoDialog(true)} title="Embed Video" className="h-8 px-2">
          <Play className="w-4 h-4" />
        </Button>
        <div className="w-px h-6 bg-border" />
        <Button size="sm" variant="outline" onClick={() => execCommand('justifyLeft')} title="Align Left" className="h-8 px-2">
          <AlignLeft className="w-4 h-4" />
        </Button>
        <Button size="sm" variant="outline" onClick={() => execCommand('justifyCenter')} title="Center" className="h-8 px-2">
          <AlignCenter className="w-4 h-4" />
        </Button>
        <Button size="sm" variant="outline" onClick={() => execCommand('justifyRight')} title="Align Right" className="h-8 px-2">
          <AlignRight className="w-4 h-4" />
        </Button>
        <div className="w-px h-6 bg-border" />
        <Button size="sm" variant="outline" onClick={handleUndo} disabled={historyIndex <= 0} title="Undo" className="h-8 px-2">
          <Undo2 className="w-4 h-4" />
        </Button>
        <Button size="sm" variant="outline" onClick={handleRedo} disabled={historyIndex >= history.length - 1} title="Redo" className="h-8 px-2">
          <Redo2 className="w-4 h-4" />
        </Button>

        {selectedImage && (
          <>
            <div className="w-px h-6 bg-border" />
            <Button size="sm" variant="outline" onClick={deleteImage} className="h-8 px-2 bg-red-50 hover:bg-red-100">
              <Trash2 className="w-4 h-4" />
            </Button>
          </>
        )}
      </div>

      {selectedImage && (
        <div className="px-4 py-2 bg-muted text-xs text-muted-foreground border-b border-border">
          💡 Drag the blue square in the corner to resize. Use alignment buttons to position.
        </div>
      )}

      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        onInput={(e) => {
          const html = (e.currentTarget as HTMLDivElement).innerHTML;
          updateContent(html);
          setupImageListeners();
        }}
        onClick={(e) => {
          if ((e.target as HTMLElement).tagName === 'IMG') {
            handleImageClick(e);
          } else if (selectedImage) {
            selectedImage.style.border = 'none';
            removeResizeHandle();
            setSelectedImage(null);
          }
        }}
        className="min-h-[400px] p-4 focus:outline-none text-base leading-relaxed"
        style={{
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
          outline: 'none',
        }}
        data-testid="simple-editor-area"
      />

      <input
        ref={imageInputRef}
        type="file"
        accept="image/*"
        onChange={handleImageInsert}
        className="hidden"
        data-testid="image-input"
      />

      <Dialog open={showVideoDialog} onOpenChange={setShowVideoDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Embed Video</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="video-url">Video URL</Label>
              <Input
                id="video-url"
                placeholder="Paste YouTube or Vimeo link"
                value={videoUrl}
                onChange={(e) => setVideoUrl(e.target.value)}
              />
              <p className="text-xs text-muted-foreground mt-2">Works with YouTube and Vimeo links</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowVideoDialog(false)}>Cancel</Button>
            <Button onClick={handleAddVideo}>Embed</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
