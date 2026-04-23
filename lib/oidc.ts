const ISSUER_URL = `${process.env.OIDC_ISSUER}/protocol/openid-connect`;

const commonParams = {
  client_id: process.env.OIDC_CLIENT_ID || "",
  client_secret: process.env.OIDC_CLIENT_SECRET || "",
  grant_type: "refresh_token",
};

async function oidcRequest(endpoint: string, bodyParams: Record<string, string>) {
  const url = `${ISSUER_URL}${endpoint}`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    credentials: "include",
    body: new URLSearchParams(bodyParams),
  });

  if (!response.ok) {
    const error: any = new Error(`OIDC Request failed`);
    error.status = response.status;
    throw error;
  }

  const contentType = response.headers.get("content-type");
  const isJson = contentType && contentType.includes("application/json");

  const data = (response.status !== 204 && isJson)
    ? await response.json()
    : null;

  return {
    status: response.status,
    data: data,
  };
}

export const refreshTokenRequest = async (refresh_token: string) => {
  try {
    const result = await oidcRequest("/token", {
      ...commonParams,
      refresh_token,
    });

    return result;
  } catch (err: any) {
    if (err.status === 400 || err.status === 401) {
      console.warn("OIDC refresh token expired or invalid");
      return null;
    }
    throw err;
  }
};

export const logoutRequest = async (refresh_token: string) => {
  try {
    return await oidcRequest("/logout", {
      ...commonParams,
      refresh_token,
    });
  } catch (err: any) {
    if (err.status === 400 || err.status === 401) {
      console.info("OIDC logout skipped: token already invalid");
      return null;
    }
    throw err;
  }
};