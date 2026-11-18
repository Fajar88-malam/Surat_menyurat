export function exportElementToWordDoc(
  sourceElement: HTMLElement | null,
  filename: string,
  paperSize: 'a4' | 'f4' = 'a4',
  marginPreset: 'normal' | 'kemendagri' = 'normal'
): void {
  if (!sourceElement) return;

  const pageSizeCss = paperSize === 'f4' ? '21.5cm 33.0cm' : '21.0cm 29.7cm';
  const marginCss =
    marginPreset === 'kemendagri'
      ? '1.5cm 1.8cm 1.5cm 2.5cm'
      : '2.0cm 2.0cm 2.0cm 2.0cm';

  // Clone node and strip screen-only controls
  const clone = sourceElement.cloneNode(true) as HTMLElement;
  clone.querySelectorAll('.no-print').forEach((el) => el.remove());

  const htmlContent = `<!DOCTYPE html>
<html xmlns:o="urn:schemas-microsoft-com:office:office"
      xmlns:w="urn:schemas-microsoft-com:office:word"
      xmlns="http://www.w3.org/TR/REC-html40">
<head>
  <meta charset="utf-8" />
  <title>${filename}</title>
  <style>
    @page {
      size: ${pageSizeCss};
      margin: ${marginCss};
    }
    body {
      font-family: Arial, sans-serif;
      font-size: 11pt;
      color: #000000;
      line-height: 1.4;
      margin: 0;
      padding: 0;
    }
    .font-kemendagri-bookman {
      font-family: "Bookman Old Style", Georgia, serif;
    }
    .font-kemendagri-arial {
      font-family: Arial, sans-serif;
    }
    table {
      border-collapse: collapse;
      width: 100%;
    }
    .border-black,
    .border-black td,
    .border-black th {
      border: 1px solid #000000;
    }
    .text-center { text-align: center; }
    .text-right { text-align: right; }
    .text-left { text-align: left; }
    .text-justify { text-align: justify; }
    .font-bold, .font-semibold { font-weight: bold; }
    .underline { text-decoration: underline; }
    .italic { font-style: italic; }
    .uppercase { text-transform: uppercase; }
    .align-top { vertical-align: top; }
    .p-1\.5 { padding: 4px 6px; }
    .p-2 { padding: 6px 8px; }
    .mb-2 { margin-bottom: 6pt; }
    .mb-3 { margin-bottom: 9pt; }
    .mb-4 { margin-bottom: 12pt; }
    .mb-5 { margin-bottom: 15pt; }
    .mb-6 { margin-bottom: 18pt; }
    .mt-2 { margin-top: 6pt; }
    .mt-3 { margin-top: 9pt; }
    .mt-4 { margin-top: 12pt; }
    .a4-page {
      page-break-after: always;
    }
    .a4-page:last-child {
      page-break-after: auto;
    }
  </style>
</head>
<body>
  ${clone.innerHTML}
</body>
</html>`;

  const blob = new Blob(['\ufeff', htmlContent], {
    type: 'application/msword;charset=utf-8',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename.endsWith('.doc') ? filename : `${filename}.doc`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
