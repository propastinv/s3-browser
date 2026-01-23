import axios from "axios";

const params = {
  client_id: process.env.OIDC_CLIENT_ID || "",
  client_secret: process.env.OIDC_CLIENT_SECRET || "",
  grant_type: "refresh_token",
};

export const oidc = axios.create({
  baseURL: `${process.env.OIDC_ISSUER}/protocol/openid-connect`,
  headers: {
    "Content-Type": "application/x-www-form-urlencoded",
  },
  withCredentials: true,
});

export const refreshTokenRequest = async (refresh_token: string) => {
  try {
    return await oidc({
      method: "POST",
      url: "/token",
      data: new URLSearchParams({
        refresh_token,
        ...params,
      }),
    });
  } catch (err: any) {
    if (err.response?.status === 400 || err.response?.status === 401) {
      console.warn("OIDC refresh token expired or invalid");
      return null;
    }
    throw err;
  }
};


export const logoutRequest = async (refresh_token: string) => {
  try {
    return await oidc({
      method: "POST",
      url: "/logout",
      data: new URLSearchParams({
        refresh_token,
        ...params,
      }),
    });
  } catch (err: any) {
    if (err.response?.status === 400 || err.response?.status === 401) {
      console.info("OIDC logout skipped: token already invalid");
      return;
    }

    throw err;
  }
};

