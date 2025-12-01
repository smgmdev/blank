import { useState, useRef, useEffect } from 'react';
import { Button } from './ui/button';
import { Bold, Italic, List, Heading2, ImageIcon, Link, Undo2, Redo2, AlignLeft, AlignCenter, AlignRight, Rows, ArrowUp, ArrowDown, Trash2 } from 'lucide-react';
import { ImageSliderModal } from './image-slider-modal';

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
  const [sliderModalOpen, setSliderModalOpen] = useState(false);
  const [selectedSlider, setSelectedSlider] = useState<HTMLElement | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  // Initialize editor content on mount
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
      const newContent = editorRef.current.innerHTML;
      updateContent(newContent);
    }
  };

  const handleUndo = () => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      if (editorRef.current) {
        editorRef.current.innerHTML = history[newIndex];
        onChange(history[newIndex]);
        editorRef.current.focus();
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
        editorRef.current.focus();
      }
    }
  };

  const handleImageInsert = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.currentTarget.files?.[0];
    if (file && editorRef.current) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = `<img src="${event.target?.result}" style="max-width: 100%; height: auto; margin: 10px 0; border-radius: 8px;" />`;
        document.execCommand('insertHTML', false, img);
        if (editorRef.current) {
          updateContent(editorRef.current.innerHTML);
        }
      };
      reader.readAsDataURL(file);
    }
    e.currentTarget.value = '';
  };

  const handleSliderInsert = (sliderHtml: string) => {
    if (editorRef.current) {
      document.execCommand('insertHTML', false, sliderHtml);
      updateContent(editorRef.current.innerHTML);
      setSliderModalOpen(false);
      editorRef.current.focus();
    }
  };

  const moveSlider = (direction: 'up' | 'down') => {
    if (!selectedSlider || !editorRef.current) return;
    
    const slider = selectedSlider.closest('.image-slider') as HTMLElement;
    if (!slider) return;

    if (direction === 'up' && slider.previousElementSibling) {
      slider.parentElement?.insertBefore(slider, slider.previousElementSibling);
    } else if (direction === 'down' && slider.nextElementSibling) {
      slider.parentElement?.insertBefore(slider.nextElementSibling, slider);
    }
    
    updateContent(editorRef.current.innerHTML);
  };

  const alignSlider = (alignment: 'left' | 'center' | 'right') => {
    if (!selectedSlider || !editorRef.current) return;
    
    const slider = selectedSlider.closest('.image-slider') as HTMLElement;
    if (!slider) return;

    slider.style.marginLeft = alignment === 'left' ? '0' : alignment === 'center' ? 'auto' : '0';
    slider.style.marginRight = alignment === 'right' ? '0' : alignment === 'center' ? 'auto' : '0';
    slider.style.display = alignment === 'center' ? 'block' : 'block';
    
    updateContent(editorRef.current.innerHTML);
  };

  const deleteSlider = () => {
    if (!selectedSlider || !editorRef.current) return;
    
    const slider = selectedSlider.closest('.image-slider') as HTMLElement;
    if (slider) {
      slider.remove();
      updateContent(editorRef.current.innerHTML);
      setSelectedSlider(null);
    }
  };

  return (
    <div className="border border-border rounded-lg overflow-hidden bg-white dark:bg-slate-950">
      <div className="bg-muted p-3 border-b border-border flex flex-wrap gap-2">
        <Button size="sm" variant="outline" onClick={() => execCommand('bold')} title="Bold (Ctrl+B)" className="h-8 px-2">
          <Bold className="w-4 h-4" />
        </Button>
        <Button size="sm" variant="outline" onClick={() => execCommand('italic')} title="Italic (Ctrl+I)" className="h-8 px-2">
          <Italic className="w-4 h-4" />
        </Button>
        <div className="w-px h-6 bg-border" />
        <Button size="sm" variant="outline" onClick={() => execCommand('insertUnorderedList')} title="Bullet List" className="h-8 px-2">
          <List className="w-4 h-4" />
        </Button>
        <Button size="sm" variant="outline" onClick={() => execCommand('insertOrderedList')} title="Numbered List" className="h-8 px-2">
          1.
        </Button>
        <div className="w-px h-6 bg-border" />
        <Button size="sm" variant="outline" onClick={() => execCommand('formatBlock', 'h2')} title="Heading 2" className="h-8 px-2">
          <Heading2 className="w-4 h-4" />
        </Button>
        <Button size="sm" variant="outline" onClick={() => execCommand('createLink', prompt('Enter URL') || '')} title="Add Link" className="h-8 px-2">
          <Link className="w-4 h-4" />
        </Button>
        <Button size="sm" variant="outline" onClick={() => imageInputRef.current?.click()} title="Insert Image" className="h-8 px-2 bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-200">
          <ImageIcon className="w-4 h-4" />
        </Button>
        <Button size="sm" variant="outline" onClick={() => setSliderModalOpen(true)} title="Insert Image Slider" className="h-8 px-2 bg-purple-50 hover:bg-purple-100 text-purple-700 border-purple-200">
          <Rows className="w-4 h-4" />
        </Button>
        <div className="w-px h-6 bg-border" />
        <Button size="sm" variant="outline" onClick={() => execCommand('justifyLeft')} title="Align Left" className="h-8 px-2">
          <AlignLeft className="w-4 h-4" />
        </Button>
        <Button size="sm" variant="outline" onClick={() => execCommand('justifyCenter')} title="Align Center" className="h-8 px-2">
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

        {selectedSlider && (
          <>
            <div className="w-px h-6 bg-border" />
            <span className="text-xs text-muted-foreground flex items-center px-2">Slider selected</span>
            <Button size="sm" variant="outline" onClick={() => moveSlider('up')} title="Move Slider Up" className="h-8 px-2 bg-yellow-50 hover:bg-yellow-100 text-yellow-700 border-yellow-200">
              <ArrowUp className="w-4 h-4" />
            </Button>
            <Button size="sm" variant="outline" onClick={() => moveSlider('down')} title="Move Slider Down" className="h-8 px-2 bg-yellow-50 hover:bg-yellow-100 text-yellow-700 border-yellow-200">
              <ArrowDown className="w-4 h-4" />
            </Button>
            <Button size="sm" variant="outline" onClick={() => alignSlider('left')} title="Align Left" className="h-8 px-2 bg-green-50 hover:bg-green-100 text-green-700 border-green-200">
              <AlignLeft className="w-4 h-4" />
            </Button>
            <Button size="sm" variant="outline" onClick={() => alignSlider('center')} title="Center" className="h-8 px-2 bg-green-50 hover:bg-green-100 text-green-700 border-green-200">
              <AlignCenter className="w-4 h-4" />
            </Button>
            <Button size="sm" variant="outline" onClick={() => alignSlider('right')} title="Align Right" className="h-8 px-2 bg-green-50 hover:bg-green-100 text-green-700 border-green-200">
              <AlignRight className="w-4 h-4" />
            </Button>
            <Button size="sm" variant="outline" onClick={deleteSlider} title="Delete Slider" className="h-8 px-2 bg-red-50 hover:bg-red-100 text-red-700 border-red-200">
              <Trash2 className="w-4 h-4" />
            </Button>
          </>
        )}
      </div>

      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        onInput={(e) => {
          const html = (e.currentTarget as HTMLDivElement).innerHTML;
          updateContent(html);
        }}
        onClick={(e) => {
          const target = e.target as HTMLElement;
          if (target.closest('.image-slider')) {
            setSelectedSlider(target.closest('.image-slider'));
          } else {
            setSelectedSlider(null);
          }
        }}
        className="min-h-[400px] p-4 focus:outline-none text-base leading-relaxed whitespace-pre-wrap"
        style={{
          fontFamily: 'system-ui, -apple-system, sans-serif',
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

      <ImageSliderModal open={sliderModalOpen} onClose={() => setSliderModalOpen(false)} onInsert={handleSliderInsert} />
    </div>
  );
}
