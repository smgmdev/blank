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
  const [selectedImageId, setSelectedImageId] = useState<string | null>(null);
  const [handlePos, setHandlePos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    if (editorRef.current && !isInitialized) {
      editorRef.current.innerHTML = content || '';
      setHistory([content || '']);
      setHistoryIndex(0);
      setIsInitialized(true);
    }
  }, [isInitialized, content]);

  // Update resize handle position when image is selected
  useEffect(() => {
    if (!selectedImageId || !editorRef.current) return;

    const updateHandlePosition = () => {
      const img = editorRef.current?.querySelector(`[data-img-id="${selectedImageId}"]`) as HTMLImageElement;
      if (img) {
        const rect = img.getBoundingClientRect();
        setHandlePos({ x: rect.left - 10, y: rect.top - 10 });
      }
    };

    updateHandlePosition();
    window.addEventListener('scroll', updateHandlePosition);
    window.addEventListener('resize', updateHandlePosition);

    return () => {
      window.removeEventListener('scroll', updateHandlePosition);
      window.removeEventListener('resize', updateHandlePosition);
    };
  }, [selectedImageId]);

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
      }
    }
  };

  const handleImageInsert = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.currentTarget.files?.[0];
    if (file && editorRef.current) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const imgId = 'img-' + Date.now();
        const img = `<img class="editor-image" data-img-id="${imgId}" src="${event.target?.result}" style="max-width: 100%; height: auto; margin: 10px 5px; border-radius: 6px; cursor: pointer; display: inline-block;" />`;
        document.execCommand('insertHTML', false, img);
        if (editorRef.current) {
          updateContent(editorRef.current.innerHTML);
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

  const selectImage = (imgId: string) => {
    if (!editorRef.current) return;

    // Deselect previous image
    if (selectedImageId !== imgId) {
      const prevImg = editorRef.current.querySelector(`[data-img-id="${selectedImageId}"]`) as HTMLImageElement;
      if (prevImg) {
        prevImg.style.border = 'none';
        prevImg.style.boxShadow = 'none';
      }
    }

    // Select new image
    const img = editorRef.current.querySelector(`[data-img-id="${imgId}"]`) as HTMLImageElement;
    if (img) {
      img.style.border = '2px solid #3b82f6';
      img.style.boxShadow = '0 0 0 4px rgba(59, 130, 246, 0.1)';
      img.style.borderRadius = '6px';
      setSelectedImageId(imgId);
    }
  };

  const handleEditorClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.classList.contains('editor-image')) {
      const imgId = target.getAttribute('data-img-id');
      if (imgId) {
        selectImage(imgId);
        e.preventDefault();
        e.stopPropagation();
      }
    } else {
      // Deselect if clicking elsewhere
      if (selectedImageId) {
        const img = editorRef.current?.querySelector(`[data-img-id="${selectedImageId}"]`) as HTMLImageElement;
        if (img) {
          img.style.border = 'none';
          img.style.boxShadow = 'none';
        }
        setSelectedImageId(null);
      }
    }
  };

  const handleResizeStart = (e: React.MouseEvent) => {
    if (!selectedImageId || !editorRef.current) return;
    
    const img = editorRef.current.querySelector(`[data-img-id="${selectedImageId}"]`) as HTMLImageElement;
    if (!img) return;

    e.preventDefault();
    e.stopPropagation();
    
    const startX = e.clientX;
    const startWidth = img.offsetWidth;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      // For top-left corner: dragging right shrinks, dragging left expands
      const deltaX = startX - moveEvent.clientX;
      const newWidth = Math.max(100, startWidth + deltaX);
      img.style.width = newWidth + 'px';
      img.style.height = 'auto';
    };

    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      if (editorRef.current) {
        updateContent(editorRef.current.innerHTML);
      }
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const alignImage = (alignment: 'left' | 'center' | 'right') => {
    if (!selectedImageId || !editorRef.current) return;
    
    const img = editorRef.current.querySelector(`[data-img-id="${selectedImageId}"]`) as HTMLImageElement;
    if (!img) return;
    
    // Always wrap in a div for consistent alignment
    let wrapper = img.parentElement;
    
    // Check if already wrapped by looking for img-wrapper class
    if (!wrapper || !wrapper.classList.contains('img-wrapper')) {
      wrapper = document.createElement('div');
      wrapper.classList.add('img-wrapper');
      img.parentNode?.insertBefore(wrapper, img);
      wrapper.appendChild(img);
    }
    
    // Clear previous alignment classes
    wrapper.classList.remove('img-left', 'img-center', 'img-right');
    wrapper.style.margin = '10px 0';
    wrapper.style.display = 'block';
    
    // Apply alignment using classes
    if (alignment === 'left') {
      wrapper.classList.add('img-left');
      wrapper.style.textAlign = 'left';
    } else if (alignment === 'center') {
      wrapper.classList.add('img-center');
      wrapper.style.textAlign = 'center';
    } else if (alignment === 'right') {
      wrapper.classList.add('img-right');
      wrapper.style.textAlign = 'right';
    }
    
    if (editorRef.current) {
      updateContent(editorRef.current.innerHTML);
    }
  };

  const deleteImage = () => {
    if (!selectedImageId || !editorRef.current) return;
    
    const img = editorRef.current.querySelector(`[data-img-id="${selectedImageId}"]`);
    if (img) {
      img.remove();
      updateContent(editorRef.current.innerHTML);
      setSelectedImageId(null);
    }
  };

  return (
    <div className="border border-border rounded-lg overflow-hidden bg-white dark:bg-slate-950">
      <style>{`
        .img-wrapper {
          display: block;
          margin: 10px 0;
        }
        .img-left {
          text-align: left;
        }
        .img-center {
          text-align: center;
        }
        .img-right {
          text-align: right;
        }
      `}</style>
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
        <Button 
          size="sm" 
          variant={selectedImageId ? "default" : "outline"} 
          onClick={() => alignImage('left')} 
          disabled={!selectedImageId} 
          title="Align Left" 
          className="h-8 px-2"
        >
          <AlignLeft className="w-4 h-4" />
        </Button>
        <Button 
          size="sm" 
          variant={selectedImageId ? "default" : "outline"} 
          onClick={() => alignImage('center')} 
          disabled={!selectedImageId} 
          title="Center" 
          className="h-8 px-2"
        >
          <AlignCenter className="w-4 h-4" />
        </Button>
        <Button 
          size="sm" 
          variant={selectedImageId ? "default" : "outline"} 
          onClick={() => alignImage('right')} 
          disabled={!selectedImageId} 
          title="Align Right" 
          className="h-8 px-2"
        >
          <AlignRight className="w-4 h-4" />
        </Button>
        <div className="w-px h-6 bg-border" />
        <Button size="sm" variant="outline" onClick={handleUndo} disabled={historyIndex <= 0} title="Undo" className="h-8 px-2">
          <Undo2 className="w-4 h-4" />
        </Button>
        <Button size="sm" variant="outline" onClick={handleRedo} disabled={historyIndex >= history.length - 1} title="Redo" className="h-8 px-2">
          <Redo2 className="w-4 h-4" />
        </Button>

        {selectedImageId && (
          <>
            <div className="w-px h-6 bg-border" />
            <Button size="sm" variant="outline" onClick={deleteImage} className="h-8 px-2 bg-red-50 hover:bg-red-100">
              <Trash2 className="w-4 h-4" />
            </Button>
          </>
        )}
      </div>

      {selectedImageId && (
        <div className="px-4 py-2 bg-blue-50 dark:bg-blue-950 text-xs text-blue-700 dark:text-blue-200 border-b border-blue-200">
          💡 Drag the resize icon (top-left) to resize. Use positioning buttons to align.
        </div>
      )}

      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        onInput={(e) => {
          const html = (e.currentTarget as HTMLDivElement).innerHTML;
          updateContent(html);
        }}
        onClick={handleEditorClick}
        className="min-h-[400px] p-4 focus:outline-none text-base leading-relaxed relative"
        style={{
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
          outline: 'none',
        }}
        data-testid="simple-editor-area"
      />

      {selectedImageId && (
        <div
          onMouseDown={handleResizeStart}
          style={{
            position: 'fixed',
            width: '20px',
            height: '20px',
            backgroundColor: '#3b82f6',
            border: '2px solid white',
            borderRadius: '4px',
            cursor: 'nwse-resize',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2)',
            zIndex: 1000,
            left: handlePos.x + 'px',
            top: handlePos.y + 'px',
          }}
          title="Drag to resize"
        />
      )}

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
