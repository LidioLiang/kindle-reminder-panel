const DEFAULT_OWNER = "LidioLiang";
const DEFAULT_REPO = "kindle-reminder-panel";
const DEFAULT_BRANCH = "main";
const PANEL_PATH = "docs/panel.json";

function getConfig() {
  const token = process.env.GITHUB_PANEL_TOKEN;
  if (!token) {
    throw new Error("GitHub panel token is not configured");
  }

  return {
    token,
    owner: process.env.GITHUB_PANEL_OWNER || DEFAULT_OWNER,
    repo: process.env.GITHUB_PANEL_REPO || DEFAULT_REPO,
    branch: process.env.GITHUB_PANEL_BRANCH || DEFAULT_BRANCH
  };
}

function githubHeaders(token) {
  return {
    Accept: "application/vnd.github+json",
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
    "X-GitHub-Api-Version": "2022-11-28"
  };
}

export async function publishPanelToGitHub(panel) {
  const { token, owner, repo, branch } = getConfig();
  const endpoint = `https://api.github.com/repos/${owner}/${repo}/contents/${PANEL_PATH}`;
  const currentResponse = await fetch(`${endpoint}?ref=${encodeURIComponent(branch)}`, {
    headers: githubHeaders(token),
    cache: "no-store"
  });

  let sha;
  if (currentResponse.ok) {
    const current = await currentResponse.json();
    sha = current.sha;
  } else if (currentResponse.status !== 404) {
    throw new Error(`Unable to read GitHub panel file (${currentResponse.status})`);
  }

  const publishedAt = new Date().toISOString();
  const content = JSON.stringify({
    todos: panel.todos,
    whiteboardHtml: panel.whiteboardHtml,
    updatedAt: publishedAt
  }, null, 2);
  const body = {
    message: "Update Kindle panel",
    content: Buffer.from(`${content}\n`, "utf8").toString("base64"),
    branch
  };

  if (sha) {
    body.sha = sha;
  }

  const updateResponse = await fetch(endpoint, {
    method: "PUT",
    headers: githubHeaders(token),
    body: JSON.stringify(body),
    cache: "no-store"
  });

  if (!updateResponse.ok) {
    throw new Error(`Unable to update GitHub panel file (${updateResponse.status})`);
  }

  return { publishedAt };
}
