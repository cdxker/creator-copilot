export function postFixture(text: string): string {
  return `
    <main>
      <article data-testid="tweet">
        <div data-testid="User-Name">Velvet Pilot @velvetpilot</div>
        <div data-testid="tweetText">${text}</div>
        <div role="group" aria-label="3 Replies. 5 reposts. 42 Likes. 1,200 views"></div>
      </article>
    </main>
  `;
}

export const profileFixture = `
  <main>
    <div data-testid="UserName">Velvet Pilot @velvetpilot</div>
    <div data-testid="UserDescription">Creator strategy, rituals, and sharp opinions.</div>
  </main>
`;
