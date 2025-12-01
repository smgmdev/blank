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
  const [isResizing, setIsResizing] = useState(false);

  useEffect(() => {
    if (editorRef.current && !isInitialized) {
      editorRef.current.innerHTML = content || '';
      setHistory([content || '']);
      setHistoryIndex(0);
      setIsInitialized(true);
    }
  }, [isInitialized, content]);

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
        const img = `<div class="editor-image" data-img-id="${imgId}" style="display: inline-block; position: relative; margin: 10px 5px;"><img src="${event.target?.result}" style="max-width: 100%; height: auto; border-radius: 6px; display: block;" /><div class="img-resize-handle" style="position: absolute; width: 20px; height: 20px; background: #3b82f6; border: 2px solid white; border-radius: 2px; bottom: -10px; right: -10px; cursor: se-resize; box-shadow: 0 2px 4px rgba(0,0,0,0.2); display: none;"></div></div>`;
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

  const handleImageClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    const imgContainer = target.closest('.editor-image');
    
    if (!imgContainer) return;
    
    const imgId = imgContainer.getAttribute('data-img-id');
    setSelectedImageId(imgId);
    
    // Show all resize handles
    if (editorRef.current) {
      editorRef.current.querySelectorAll('.img-resize-handle').forEach(h => {
        (h as HTMLElement).style.display = 'none';
      });
      const handle = imgContainer.querySelector('.img-resize-handle') as HTMLElement;
      if (handle) handle.style.display = 'block';
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.classList.contains('img-resize-handle')) {
      e.preventDefault();
      setIsResizing(true);
    }
  };

  useEffect(() => {
    if (!isResizing || !selectedImageId || !editorRef.current) return;

    const imgContainer = editorRef.current.querySelector(`[data-img-id="${selectedImageId}"]`) as HTMLElement;
    if (!imgContainer) return;

    const img = imgContainer.querySelector('img') as HTMLImageElement;
    const startX = (event as MouseEvent).clientX;
    const startWidth = img.offsetWidth;

    const handleMouseMove = (e: MouseEvent) => {
      const deltaX = e.clientX - startX;
      img.style.width = Math.max(100, startWidth + deltaX) + 'px';
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
  }, [isResizing, selectedImageId]);

  const alignImage = (alignment: 'left' | 'center' | 'right') => {
    if (!selectedImageId || !editorRef.current) return;
    
    const imgContainer = editorRef.current.querySelector(`[data-img-id="${selectedImageId}"]`) as HTMLElement;
    if (!imgContainer) return;
    
    imgContainer.style.textAlign = '';
    imgContainer.style.marginLeft = '';
    imgContainer.style.marginRight = '';
    imgContainer.style.display = 'inline-block';
    
    if (alignment === 'left') {
      imgContainer.style.marginRight = '0';
    } else if (alignment === 'center') {
      imgContainer.style.display = 'block';
      imgContainer.style.marginLeft = 'auto';
      imgContainer.style.marginRight = 'auto';
    } else if (alignment === 'right') {
      imgContainer.style.marginLeft = 'auto';
    }
    
    updateContent(editorRef.current.innerHTML);
  };

  const deleteImage = () => {
    if (!selectedImageId || !editorRef.current) return;
    
    const imgContainer = editorRef.current.querySelector(`[data-img-id="${selectedImageId}"]`);
    if (imgContainer) {
      imgContainer.remove();
      updateContent(editorRef.current.innerHTML);
      setSelectedImageId(null);
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
        <Button size="sm" variant="outline" onClick={() => alignImage('left')} title="Align Left" className="h-8 px-2">
          <AlignLeft className="w-4 h-4" />
        </Button>
        <Button size="sm" variant="outline" onClick={() => alignImage('center')} title="Center" className="h-8 px-2">
          <AlignCenter className="w-4 h-4" />
        </Button>
        <Button size="sm" variant="outline" onClick={() => alignImage('right')} title="Align Right" className="h-8 px-2">
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
        }}
        onClick={handleImageClick}
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
