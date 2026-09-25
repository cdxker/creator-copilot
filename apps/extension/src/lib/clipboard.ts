export async function copyDraft(text: string): Promise<void> {
  await navigator.clipboard.writeText(text);
}
