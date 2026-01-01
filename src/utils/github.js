const API = "https://api.github.com";

const headers = () => ({
  Authorization: `token ${import.meta.env.VITE_GITHUB_TOKEN}`,
  Accept: "application/vnd.github+json",
});

export async function getFile(path) {
  const url = `${API}/repos/${import.meta.env.VITE_GITHUB_OWNER}/${import.meta.env.VITE_GITHUB_REPO}/contents/${path}`;
  
  const res = await fetch(url, { 
    headers: headers(), 
    cache: "no-store" 
  });

  if (!res.ok) {
    // THIS WILL TELL US IF IT'S A TOKEN ISSUE OR A PATH ISSUE
    console.error(`GITHUB ERROR STATUS: ${res.status}`);
    const errorBody = await res.json();
    console.error("GITHUB ERROR MESSAGE:", errorBody.message);
    return null;
  }
  return res.json();
}

export async function commitFile({ path, content, message, sha, isBase64 = false }) {
  // If it's an image, it's already base64. 
  // If it's the JS file text, we encode it.
 // Replace the old encodedContent line with this:
const encodedContent = isBase64 
  ? content 
  : btoa(encodeURIComponent(content).replace(/%([0-9A-F]{2})/g, (match, p1) => {
      return String.fromCharCode('0x' + p1);
    }));

  const body = {
    message,
    content: encodedContent,
    branch: import.meta.env.VITE_GITHUB_BRANCH,
  };
  
  if (sha) body.sha = sha;

  const res = await fetch(
    `${API}/repos/${import.meta.env.VITE_GITHUB_OWNER}/${import.meta.env.VITE_GITHUB_REPO}/contents/${path}`,
    {
      method: "PUT",
      headers: headers(),
      body: JSON.stringify(body),
    }
  );

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.message || "Failed to commit to GitHub");
  }
  return res.json();
}