/**
 * navigator.clipboard is only available in a "secure context" (HTTPS or
 * localhost) — on a plain-HTTP deployment (common for a first pairing test
 * before TLS is set up) it's simply undefined, and calling .writeText on it
 * throws, silently breaking every "Copy" button on the page. Falls back to
 * the older document.execCommand('copy') approach (a hidden, off-screen
 * textarea gets selected and copied) which works without a secure context.
 *
 * @returns true if the copy succeeded via either method.
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // Fall through to the legacy approach below.
    }
  }

  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.style.position = 'fixed';
  textarea.style.opacity = '0';
  textarea.style.left = '-9999px';
  document.body.appendChild(textarea);
  textarea.focus();
  textarea.select();

  let succeeded = false;
  try {
    succeeded = document.execCommand('copy');
  } catch {
    succeeded = false;
  }

  document.body.removeChild(textarea);
  return succeeded;
}
