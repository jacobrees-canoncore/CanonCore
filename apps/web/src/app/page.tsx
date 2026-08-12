import { siteName } from "@canoncore/config";

export default function Home() {
  return (
    <main>
      <h1>{siteName}</h1>
      <p className="lead">Being rebuilt.</p>
      <hr />
      <p>
        Nothing to see here yet. This domain is reserved for the new version,
        which is still in development.
      </p>
    </main>
  );
}
