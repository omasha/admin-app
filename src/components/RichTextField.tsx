// The rich text editor for every staff-written HTML field (REFACTOR_PLAN §5.2, decision #13):
// content-block bodies, HTML widget bodies and form instructions.
//
// The toolbar offers only what the API keeps (portal-api-v2 core/sanitize.py): headings 2–4,
// bold, italic, bulleted and numbered lists, links. Anything else is removed on save, and the
// saved answer is loaded back, so what's shown after saving is exactly what participants see.

import { useEffect } from "react";
import { Input } from "@mantine/core";
import { Link, RichTextEditor } from "@mantine/tiptap";
import { useEditor } from "@tiptap/react";
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
        </RichTextEditor.Toolbar>
        <RichTextEditor.Content mih={140} />
      </RichTextEditor>
    </Input.Wrapper>
  );
}
