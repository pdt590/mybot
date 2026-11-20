import { defineMessages } from "../../../message";

export const messages = defineMessages("error.attachment", {
  "error.attachment.notFound": "Attachment was not found.",
  "error.attachment.fileTooLarge": "A file exceeds the 100 MB limit.",
  "error.attachment.namedFileTooLarge": "{name} is larger than the 100 MB limit.",
  "error.attachment.totalTooLarge": "Attachments exceed the 250 MB total limit.",
  "error.attachment.unavailable": "This file is no longer available.",
  "error.attachment.tooMany": "Choose at most {limit} files.",
  "error.attachment.mediaUnsupported":
    "This server does not support MP3 or MOV attachments. Update MyBot on the host and retry.",
  "error.attachment.emlUnsupported":
    "This server does not support EML attachments. Update MyBot on the host and retry.",
  "error.attachment.zipUnsupported":
    "This server does not support ZIP attachments. Update MyBot on the host and retry.",
  "error.attachment.mp4Unsupported":
    "This server does not support MP4 attachments. Update MyBot on the host and retry.",
  "error.attachment.svgUnsupported":
    "This server does not support SVG attachments. Update MyBot on the host and retry.",
  "error.attachment.previewTooLarge": "The file exceeds the 100 MB limit.",
});
