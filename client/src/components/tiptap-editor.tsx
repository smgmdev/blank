import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import TextAlign from "@tiptap/extension-text-align";
import Color from "@tiptap/extension-color";
import Highlight from "@tiptap/extension-highlight";
import { Button } from "./ui/button";
import {
  Bold, Italic, List, Link as LinkIcon, ImageIcon, AlignLeft,
  AlignCenter, AlignRight, Type, Minus, Undo2, Redo2, Trash2
} from "lucide-react";
import { useRef } from "react";

interface TiptapEditorProps {
  content: string;
  onChange: (content: string) => void;
  onImageInsert: (base64: string, caption?: string) => void;
  onEmptyChange: (isEmpty: boolean) => void;
}

export function TiptapEditor({ content, onChange, onImageInsert, onEmptyChange }: TiptapEditorProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3, 4] },
      }),
      Image.configure({
        allowBase64: true,
        HTMLAttributes: {
          class: 'max-w-full h-auto rounded-lg my-4',
        },
      }),
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
      Color,
      Highlight.configure({
        multicolor: true,
      }),
    ],
    content: content || '<p></p>',
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      onChange(html);
      const isEmpty = editor.isEmpty;
      onEmptyChange(isEmpty);
    },
  });

  if (!editor) return null;

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.currentTarget.files;
    if (files && files.length > 0) {
      const file = files[0];
      const reader = new FileReader();
      reader.onload = (event) => {
        const base64 = event.target?.result as string;
        onImageInsert(base64);
      };
      reader.readAsDataURL(file);
    }
    e.currentTarget.value = '';
  };

  return (
    <div className="border border-border rounded-lg overflow-hidden">
      {/* Toolbar */}
      <div className="bg-gradient-to-r from-muted to-muted/80 border-b border-border p-2 space-y-2 flex flex-wrap gap-1">
        {/* Text formatting */}
        <Button
          size="sm"
          variant={editor.isActive('bold') ? 'default' : 'outline'}
          onClick={() => editor.chain().focus().toggleBold().run()}
          className="h-8 px-2"
          data-testid="button-bold"
          title="Bold"
        >
          <Bold className="w-4 h-4" />
        </Button>

        <Button
          size="sm"
          variant={editor.isActive('italic') ? 'default' : 'outline'}
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className="h-8 px-2"
          data-testid="button-italic"
          title="Italic"
        >
          <Italic className="w-4 h-4" />
        </Button>

        <Button
          size="sm"
          variant={editor.isActive('underline') ? 'default' : 'outline'}
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          className="h-8 px-2"
          data-testid="button-underline"
          title="Underline"
        >
          <u>U</u>
        </Button>

        <div className="w-px h-6 bg-border" />

        {/* Headings */}
        <select
          onChange={(e) => {
            if (e.target.value === 'p') {
              editor.chain().focus().setParagraph().run();
            } else {
              editor.chain().focus().toggleHeading({ level: parseInt(e.target.value) as any }).run();
            }
            e.target.value = 'p';
          }}
          className="px-2 py-1 text-sm border border-border rounded h-8 bg-background hover:bg-muted transition-colors"
          data-testid="select-heading"
        >
          <option value="p">Paragraph</option>
          <option value="2">Heading 2</option>
          <option value="3">Heading 3</option>
          <option value="4">Heading 4</option>
        </select>

        <div className="w-px h-6 bg-border" />

        {/* Alignment */}
        <Button
          size="sm"
          variant={editor.isActive({ textAlign: 'left' }) ? 'default' : 'outline'}
          onClick={() => editor.chain().focus().setTextAlign('left').run()}
          className="h-8 px-2"
          data-testid="button-align-left"
          title="Align Left"
        >
          <AlignLeft className="w-4 h-4" />
        </Button>

        <Button
          size="sm"
          variant={editor.isActive({ textAlign: 'center' }) ? 'default' : 'outline'}
          onClick={() => editor.chain().focus().setTextAlign('center').run()}
          className="h-8 px-2"
          data-testid="button-align-center"
          title="Align Center"
        >
          <AlignCenter className="w-4 h-4" />
        </Button>

        <Button
          size="sm"
          variant={editor.isActive({ textAlign: 'right' }) ? 'default' : 'outline'}
          onClick={() => editor.chain().focus().setTextAlign('right').run()}
          className="h-8 px-2"
          data-testid="button-align-right"
          title="Align Right"
        >
          <AlignRight className="w-4 h-4" />
        </Button>

        <div className="w-px h-6 bg-border" />

        {/* Lists */}
        <Button
          size="sm"
          variant={editor.isActive('bulletList') ? 'default' : 'outline'}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className="h-8 px-2"
          data-testid="button-bullet-list"
          title="Bullet List"
        >
          <List className="w-4 h-4" />
        </Button>

        <Button
          size="sm"
          variant={editor.isActive('orderedList') ? 'default' : 'outline'}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className="h-8 px-2"
          data-testid="button-ordered-list"
          title="Numbered List"
        >
          1.
        </Button>

        <Button
          size="sm"
          variant="outline"
          onClick={() => {
            const url = prompt('Enter URL:');
            if (url) editor.chain().focus().setLink({ href: url }).run();
          }}
          className="h-8 px-2"
          data-testid="button-link"
          title="Add Link"
        >
          <LinkIcon className="w-4 h-4" />
        </Button>

        <div className="w-px h-6 bg-border" />

        {/* Image */}
        <Button
          size="sm"
          variant="outline"
          onClick={() => fileInputRef.current?.click()}
          className="h-8 px-3 gap-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-200"
          data-testid="button-insert-image"
          title="Insert Image"
        >
          <ImageIcon className="w-4 h-4" />
          <span className="text-xs font-medium">Photo</span>
        </Button>

        {/* Colors */}
        <div className="flex gap-1 items-center">
          <input
            type="color"
            defaultValue="#000000"
            onChange={(e) => editor.chain().focus().setColor(e.target.value).run()}
            title="Text Color"
            className="h-8 w-8 border border-border rounded cursor-pointer"
            data-testid="color-text"
          />
          <input
            type="color"
            defaultValue="#ffff00"
            onChange={(e) => editor.chain().focus().setHighlight({ color: e.target.value }).run()}
            title="Highlight Color"
            className="h-8 w-8 border border-border rounded cursor-pointer"
            data-testid="color-highlight"
          />
        </div>

        <div className="w-px h-6 bg-border" />

        {/* Undo/Redo */}
        <Button
          size="sm"
          variant="outline"
          onClick={() => editor.chain().focus().undo().run()}
          className="h-8 px-2"
          data-testid="button-undo"
          title="Undo"
        >
          <Undo2 className="w-4 h-4" />
        </Button>

        <Button
          size="sm"
          variant="outline"
          onClick={() => editor.chain().focus().redo().run()}
          className="h-8 px-2"
          data-testid="button-redo"
          title="Redo"
        >
          <Redo2 className="w-4 h-4" />
        </Button>

        <Button
          size="sm"
          variant="outline"
          onClick={() => editor.chain().focus().clearNodes().run()}
          className="h-8 px-2 text-destructive hover:text-destructive"
          data-testid="button-clear"
          title="Clear Formatting"
        >
          <Minus className="w-4 h-4" />
        </Button>
      </div>

      {/* Editor Content */}
      <EditorContent
        editor={editor}
        className="prose prose-sm dark:prose-invert max-w-none p-4 focus:outline-none min-h-[400px] bg-white dark:bg-slate-950"
        data-testid="editor-content"
      />

      {/* Hidden image input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleImageSelect}
        className="hidden"
        data-testid="hidden-image-input"
      />

      <style>{`
        .ProseMirror {
          outline: none;
        }
        .ProseMirror img {
          max-width: 100%;
          height: auto;
          border-radius: 8px;
          margin: 16px 0;
          cursor: grab;
          border: 1px solid rgba(0,0,0,0.1);
          transition: all 0.2s;
        }
        .ProseMirror img:active {
          cursor: grabbing;
        }
        .ProseMirror img:hover {
          border-color: #3b82f6;
          box-shadow: 0 2px 8px rgba(59, 130, 246, 0.2);
        }
      `}</style>
    </div>
  );
}
