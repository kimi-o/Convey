import { File, FileText, FileSpreadsheet, FileImage, FileArchive, FileCode, FileAudio, FileVideo, Presentation } from "lucide-react";

const ICONS = [
  [/^(xls|xlsx|csv|ods|tsv)$/, FileSpreadsheet],
  [/^(ppt|pptx|odp|key)$/, Presentation],
  [/^(png|jpe?g|gif|webp|svg|bmp|heic)$/, FileImage],
  [/^(zip|rar|7z|tar|gz)$/, FileArchive],
  [/^(js|ts|json|html|css|xml|py|java|c|cpp|md|yml|yaml)$/, FileCode],
  [/^(mp3|wav|m4a|flac)$/, FileAudio],
  [/^(mp4|mov|avi|mkv|webm)$/, FileVideo],
  [/^(pdf|doc|docx|odt|rtf|txt)$/, FileText],
];

const LABELS = {
  pdf: "PDF document", doc: "Word document", docx: "Word document", odt: "Text document", rtf: "Text document",
  txt: "Text file", xls: "Excel spreadsheet", xlsx: "Excel spreadsheet", csv: "CSV spreadsheet", ods: "Spreadsheet",
  ppt: "PowerPoint presentation", pptx: "PowerPoint presentation", png: "PNG image", jpg: "JPEG image",
  jpeg: "JPEG image", gif: "GIF image", webp: "WebP image", svg: "SVG image", zip: "ZIP archive",
  json: "JSON file", md: "Markdown file",
};

export const extOf = (name = "") => (name.includes(".") ? name.split(".").pop().toLowerCase() : "");
export const kindLabel = (name) => LABELS[extOf(name)] || (extOf(name) ? `${extOf(name).toUpperCase()} file` : "File");

export default function FileIcon({ name, size = "md" }) {
  const Icon = ICONS.find(([re]) => re.test(extOf(name)))?.[1] || File;
  const box = size === "lg" ? "size-12" : "size-8";
  return (
    <span className={`flex ${box} shrink-0 items-center justify-center border border-white/10 bg-card-2 text-ink-3`}>
      <Icon size={size === "lg" ? 22 : 16} strokeWidth={1.5} />
    </span>
  );
}