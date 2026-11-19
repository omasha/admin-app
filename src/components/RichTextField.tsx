// The rich text editor for every staff-written HTML field (REFACTOR_PLAN §5.2, decision #13):
// content-block bodies, HTML widget bodies and form instructions.
//
// The toolbar offers only what the API keeps (portal-api-v2 core/sanitize.py): headings 2–4,
// bold, italic, bulleted and numbered lists, links, tables (not offered as buttons: paste them
// in the HTML view, see below).
//
// "HTML" in the toolbar swaps the editor for a plain box holding the raw HTML, for what is easier
// pasted than built (tables). The API cleans it on save like everything else. Anything else is removed on save, and the
// saved answer is loaded back, so what's shown after saving is exactly what participants see.

import { useEffect, useState } from "react";
import { Input, Textarea } from "@mantine/core";
import { Link, RichTextEditor } from "@mantine/tiptap";
import { useEditor } from "@tiptap/react";
import { Table, TableCell, TableHeader, TableRow } from "@tiptap/extension-table";
import StarterKit from "@tiptap/starter-kit";

import "@mantine/tiptap/styles.css";

type Props = {
  label: string;
  description?: string;
  value: string | null | undefined;
  onChange: (html: string) => void;
  error?: string;
};

const EMPTY = "<p></p>";

export function RichTextField({ label, description, value, onChange, error }: Props) {
  const [htmlView, setHtmlView] = useState(false);
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3, 4] },
        // Not kept by the API, so not offered:
        blockquote: false,
        code: false,
        codeBlock: false,
        horizontalRule: false,
        strike: false,
        underline: false,
        link: false, // replaced by Mantine's Link below
      }),
      Link.configure({ openOnClick: false, protocols: ["mailto"], defaultProtocol: "https" }),
      Table, TableRow, TableHeader, TableCell,
    ],
    content: value || "",
    immediatelyRender: true,
    shouldRerenderOnTransaction: false,
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      onChange(html === EMPTY ? "" : html);
    },
  });

  // The record arrives after the editor is made (edit pages load it), and comes back cleaned
  // after a save: show the new value when it differs from what's in the editor.
  useEffect(() => {
    if (!editor) return;
    const current = editor.getHTML();
    const next = value || "";
    if (next !== current && !(next === "" && current === EMPTY)) {
      editor.commands.setContent(next, { emitUpdate: false });
    }
  }, [editor, value]);

  return (
    <Input.Wrapper label={label} description={description} error={error}>
      <RichTextEditor editor={editor} mt={4} aria-label={label}>
        <RichTextEditor.Toolbar>
          <RichTextEditor.ControlsGroup>
            <RichTextEditor.H2 />
            <RichTextEditor.H3 />
            <RichTextEditor.H4 />
          </RichTextEditor.ControlsGroup>
          <RichTextEditor.ControlsGroup>
            <RichTextEditor.Bold />
            <RichTextEditor.Italic />
            <RichTextEditor.ClearFormatting />
          </RichTextEditor.ControlsGroup>
          <RichTextEditor.ControlsGroup>
            <RichTextEditor.BulletList />
            <RichTextEditor.OrderedList />
          </RichTextEditor.ControlsGroup>
          <RichTextEditor.ControlsGroup>
            <RichTextEditor.Link />
            <RichTextEditor.Unlink />
          </RichTextEditor.ControlsGroup>
          <RichTextEditor.ControlsGroup>
            <RichTextEditor.Control onClick={() => setHtmlView((on) => !on)} active={htmlView}
                                    aria-label="Edit as HTML" title="Edit as HTML" style={{ width: "auto", padding: "0 8px" }}>
              HTML
            </RichTextEditor.Control>
          </RichTextEditor.ControlsGroup>
        </RichTextEditor.Toolbar>
        {htmlView ? (
          <Textarea value={value ?? ""} onChange={(e) => onChange(e.currentTarget.value)} autosize minRows={8}
                    spellCheck={false} aria-label={`${label} (HTML)`} styles={{ input: { fontFamily: "monospace", border: 0 } }} />
        ) : (
          <RichTextEditor.Content mih={140} />
        )}
      </RichTextEditor>
    </Input.Wrapper>
  );
}
