import { PROJECT_DONATION_ADDRESS, REPO_URL } from "../constants";

function href(path: string) {
  const base = import.meta.env.BASE_URL;
  return `${base}${path.replace(/^\//, "")}`;
}

export function Banner() {
  const short = `${PROJECT_DONATION_ADDRESS.slice(0, 22)}…${PROJECT_DONATION_ADDRESS.slice(-8)}`;
  return (
    <header className="banner">
      <a className="banner-brand" href={href("#/")}>CASHNAME</a>
      <div className="banner-links">
        <a href={href("#/deck")}>Deck</a>
        <a href={REPO_URL} target="_blank" rel="noreferrer">Source</a>
        <a href={href("#/protocol")}>Protocol</a>
        <span className="banner-donate" title={PROJECT_DONATION_ADDRESS}>
          EMBER2026: {short}
        </span>
        <button
          className="copy"
          type="button"
          onClick={() => void navigator.clipboard.writeText(PROJECT_DONATION_ADDRESS)}
        >
          Copy
        </button>
      </div>
    </header>
  );
}
