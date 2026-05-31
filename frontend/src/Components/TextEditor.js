import { useEffect, useRef } from "react";
import Quill from "quill";
import "quill/dist/quill.snow.css";

export default function TextEditor({
    value,
    onChange
}) {
    const editorRef = useRef(null);
    const quillRef = useRef(null);

    useEffect(() => {
        if (!editorRef.current || quillRef.current) return;

        const quill = new Quill(editorRef.current, {
            theme: "snow",
            modules: {
                toolbar: [
                    ['bold', 'italic', 'underline', 'strike'],
                    [{ script: 'sub' }, { script: 'super' }],
                    [{ header: [1, 2, 3, false] }],
                    [{ list: 'ordered' }, { list: 'bullet' }],
                    [{ align: [] }],
                    [{ color: [] }, { background: [] }],
                    ['clean']
                ]
            }
        });

        quill.root.innerHTML = value || '';

        quill.on("text-change", () => {
            onChange(quill.root.innerHTML);
        });

        quillRef.current = quill;
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return (
        <div
            style={{
                backgroundColor: "white",
                borderRadius: "6px"
            }}
        >
            <div ref={editorRef}></div>
        </div>
    );
}