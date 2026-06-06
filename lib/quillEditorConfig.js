/**
 * Shared ReactQuill toolbar/modules — used by production editors.
 * Clipboard matchers are minimal to reduce pasted HTML attack surface (quill XSS advisories).
 */
export const quillToolbarModules = {
  toolbar: [
    [{ header: [1, 2, 3, false] }],
    ["bold", "italic", "underline", "strike"],
    [{ list: "ordered" }, { list: "bullet" }],
    ["link"],
    ["clean"],
  ],
  clipboard: {
    matchVisual: false,
  },
};

export default quillToolbarModules;
