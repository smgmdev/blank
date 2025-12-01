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
      img.addEventListener('click', handleImageClick);
      img.style.cursor = 'pointer';
    });
  };

  const handleImageClick = (e: Event) => {
    const img = e.target as HTMLImageElement;
    setSelectedImage(img);
    img.style.border = '2px solid #3b82f6';
    img.style.borderRadius = '4px';
  };

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
      }
    }
  };

  const handleImageInsert = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.currentTarget.files?.[0];
    if (file && editorRef.current) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = `<img src="${event.target?.result}" style="max-width: 100%; height: auto; margin: 10px 0; border-radius: 6px; cursor: pointer;" />`;
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
    
    const wrapper = document.createElement('div');
    wrapper.style.textAlign = alignment;
    wrapper.style.margin = '10px 0';
    
    selectedImage.style.border = '2px solid #3b82f6';
    selectedImage.style.borderRadius = '4px';
    selectedImage.style.maxWidth = '100%';
    
    if (alignment === 'center') {
      wrapper.style.display = 'flex';
      wrapper.style.justifyContent = 'center';
    }
    
    selectedImage.parentNode?.replaceChild(wrapper, selectedImage);
    wrapper.appendChild(selectedImage);
    
    if (editorRef.current) {
      updateContent(editorRef.current.innerHTML);
    }
  };

  const resizeImage = (newWidth: number) => {
    if (!selectedImage) return;
    selectedImage.style.width = newWidth + 'px';
    selectedImage.style.height = 'auto';
    if (editorRef.current) {
      updateContent(editorRef.current.innerHTML);
    }
  };

  const deleteImage = () => {
    if (!selectedImage) return;
    selectedImage.remove();
    setSelectedImage(null);
    if (editorRef.current) {
      updateContent(editorRef.current.innerHTML);
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (selectedImage && e.shiftKey) {
      setIsResizing(true);
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isResizing && selectedImage) {
      const currentWidth = selectedImage.offsetWidth;
      const deltaX = e.movementX;
      const newWidth = Math.max(100, currentWidth + deltaX);
      resizeImage(newWidth);
    }
  };

  const handleMouseUp = () => {
    setIsResizing(false);
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
            <span className="text-xs text-muted-foreground flex items-center px-2">Image selected</span>
            <Button size="sm" variant="outline" onClick={() => alignImage('left')} className="h-8 px-2">
              <AlignLeft className="w-4 h-4" />
            </Button>
            <Button size="sm" variant="outline" onClick={() => alignImage('center')} className="h-8 px-2">
              <AlignCenter className="w-4 h-4" />
            </Button>
            <Button size="sm" variant="outline" onClick={() => alignImage('right')} className="h-8 px-2">
              <AlignRight className="w-4 h-4" />
            </Button>
            <Button size="sm" variant="outline" onClick={() => deleteImage()} className="h-8 px-2 bg-red-50 hover:bg-red-100">
              <Trash2 className="w-4 h-4" />
            </Button>
          </>
        )}
      </div>

      <div className="px-4 pt-2 pb-2 bg-muted text-xs text-muted-foreground border-b border-border">
        {selectedImage ? '💡 Click on image to select. Hold Shift + drag right to resize. Use alignment buttons above.' : '💡 Click on images to select and adjust alignment'}
      </div>

      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        onInput={(e) => {
          const html = (e.currentTarget as HTMLDivElement).innerHTML;
          updateContent(html);
          setupImageListeners();
        }}
        onClick={() => {
          if (selectedImage && !(event?.target as HTMLImageElement).tagName) {
            selectedImage.style.border = 'none';
            setSelectedImage(null);
          }
        }}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseDown={handleMouseDown}
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
