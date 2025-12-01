import { useState, useCallback } from 'react';
import { createEditor, Descendant, Editor as SlateEditor, Transforms, Element as SlateElement } from 'slate';
import { Slate, Editable, withReact } from 'slate-react';
import { withHistory } from 'slate-history';
import { Button } from './ui/button';
import { Bold, Italic, List, Heading2, Link, Undo2, Redo2, AlignLeft, AlignCenter, AlignRight, Image as ImageIcon } from 'lucide-react';

interface SimpleEditorProps {
  content: string;
  onChange: (content: string) => void;
  onEmptyChange: (isEmpty: boolean) => void;
}

const initialValue: Descendant[] = [
  {
    type: 'paragraph',
    children: [{ text: '' }],
  },
];

export function SimpleEditor({ content, onChange, onEmptyChange }: SimpleEditorProps) {
  const [editor] = useState(() => withHistory(withReact(createEditor())));
  const [value, setValue] = useState<Descendant[]>(() => {
    try {
      return content ? JSON.parse(content) : initialValue;
    } catch {
      return initialValue;
    }
  });

  const handleChange = (newValue: Descendant[]) => {
    setValue(newValue);
    const json = JSON.stringify(newValue);
    onChange(json);
    
    const isEmpty = newValue.every(node => {
      if (SlateElement.isElement(node)) {
        return node.children.every((child: any) => child.text?.trim() === '');
      }
      return node.text?.trim() === '';
    });
    onEmptyChange(isEmpty);
  };

  const toggleBold = () => {
    const isActive = isMarkActive(editor, 'bold');
    if (isActive) {
      SlateEditor.removeMark(editor, 'bold');
    } else {
      SlateEditor.addMark(editor, 'bold', true);
    }
  };

  const toggleItalic = () => {
    const isActive = isMarkActive(editor, 'italic');
    if (isActive) {
      SlateEditor.removeMark(editor, 'italic');
    } else {
      SlateEditor.addMark(editor, 'italic', true);
    }
  };

  const toggleHeading = () => {
    const isActive = isBlockActive(editor, 'heading-two');
    Transforms.setNodes(
      editor,
      { type: isActive ? 'paragraph' : 'heading-two' },
      { match: n => SlateEditor.isBlock(editor, n) }
    );
  };

  const toggleList = () => {
    const isActive = isBlockActive(editor, 'bulleted-list');
    if (isActive) {
      Transforms.setNodes(
        editor,
        { type: 'paragraph' },
        { match: n => SlateEditor.isBlock(editor, n) }
      );
    } else {
      Transforms.setNodes(
        editor,
        { type: 'bulleted-list' },
        { match: n => SlateEditor.isBlock(editor, n) }
      );
    }
  };

  const setAlign = (alignment: 'left' | 'center' | 'right') => {
    Transforms.setNodes(
      editor,
      { align: alignment },
      { match: n => SlateEditor.isBlock(editor, n) }
    );
  };

  const renderElement = useCallback((props: any) => {
    const { attributes, children, element } = props;
    
    const baseStyle = {
      textAlign: (element.align as any) || 'left' as const,
    };

    switch (element.type) {
      case 'heading-two':
        return (
          <h2 {...attributes} style={{ ...baseStyle, fontSize: '24px', fontWeight: 'bold', marginTop: '10px', marginBottom: '5px' }}>
            {children}
          </h2>
        );
      case 'bulleted-list':
        return (
          <li {...attributes} style={baseStyle}>
            {children}
          </li>
        );
      default:
        return (
          <p {...attributes} style={baseStyle}>
            {children}
          </p>
        );
    }
  }, []);

  const renderLeaf = useCallback((props: any) => {
    const { attributes, children, leaf } = props;
    let content = children;

    if (leaf.bold) {
      content = <strong>{content}</strong>;
    }
    if (leaf.italic) {
      content = <em>{content}</em>;
    }

    return <span {...attributes}>{content}</span>;
  }, []);

  return (
    <Slate editor={editor} initialValue={value} onChange={handleChange}>
      <div className="border border-border rounded-lg overflow-hidden bg-white dark:bg-slate-950">
        <div className="bg-muted p-2 border-b border-border flex flex-wrap gap-1">
          <Button
            size="sm"
            variant={isMarkActive(editor, 'bold') ? 'default' : 'outline'}
            onMouseDown={(e) => { e.preventDefault(); toggleBold(); }}
            className="h-8 px-2"
          >
            <Bold className="w-4 h-4" />
          </Button>
          <Button
            size="sm"
            variant={isMarkActive(editor, 'italic') ? 'default' : 'outline'}
            onMouseDown={(e) => { e.preventDefault(); toggleItalic(); }}
            className="h-8 px-2"
          >
            <Italic className="w-4 h-4" />
          </Button>
          <div className="w-px h-6 bg-border" />
          <Button
            size="sm"
            variant={isBlockActive(editor, 'heading-two') ? 'default' : 'outline'}
            onMouseDown={(e) => { e.preventDefault(); toggleHeading(); }}
            className="h-8 px-2"
          >
            <Heading2 className="w-4 h-4" />
          </Button>
          <Button
            size="sm"
            variant={isBlockActive(editor, 'bulleted-list') ? 'default' : 'outline'}
            onMouseDown={(e) => { e.preventDefault(); toggleList(); }}
            className="h-8 px-2"
          >
            <List className="w-4 h-4" />
          </Button>
          <div className="w-px h-6 bg-border" />
          <Button size="sm" variant="outline" onMouseDown={(e) => { e.preventDefault(); setAlign('left'); }} className="h-8 px-2">
            <AlignLeft className="w-4 h-4" />
          </Button>
          <Button size="sm" variant="outline" onMouseDown={(e) => { e.preventDefault(); setAlign('center'); }} className="h-8 px-2">
            <AlignCenter className="w-4 h-4" />
          </Button>
          <Button size="sm" variant="outline" onMouseDown={(e) => { e.preventDefault(); setAlign('right'); }} className="h-8 px-2">
            <AlignRight className="w-4 h-4" />
          </Button>
          <div className="w-px h-6 bg-border" />
          <Button size="sm" variant="outline" onMouseDown={(e) => { e.preventDefault(); editor.undo(); }} className="h-8 px-2">
            <Undo2 className="w-4 h-4" />
          </Button>
          <Button size="sm" variant="outline" onMouseDown={(e) => { e.preventDefault(); editor.redo(); }} className="h-8 px-2">
            <Redo2 className="w-4 h-4" />
          </Button>
        </div>

        <Editable
          renderElement={renderElement}
          renderLeaf={renderLeaf}
          placeholder="Start writing your article..."
          style={{ minHeight: '400px', padding: '16px', fontFamily: 'system-ui, -apple-system, sans-serif' }}
          data-testid="simple-editor-area"
        />
      </div>
    </Slate>
  );
}

const isMarkActive = (editor: any, format: string) => {
  const marks = SlateEditor.marks(editor);
  return marks ? marks[format] === true : false;
};

const isBlockActive = (editor: any, format: string) => {
  const [match] = SlateEditor.nodes(editor, {
    match: n => n.type === format,
  });
  return !!match;
};
