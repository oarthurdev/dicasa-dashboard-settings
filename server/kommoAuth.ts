import { supabaseClient } from "./supabase.ts";

interface TokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
}

export class KommoAuthManager {
  /**
   * Refresh an expired access token using the refresh token
   */
  static async refreshAccessToken(
    apiUrl: string,
    clientId: string,
    clientSecret: string,
    refreshToken: string,
  ): Promise<TokenResponse> {
    // Extract the base domain from the API URL
    const urlObj = new URL(apiUrl);
    const baseUrl = `${urlObj.protocol}//${urlObj.hostname}`;
    const tokenUrl = `${baseUrl}/oauth2/access_token`;

    console.log(`Attempting token refresh at: ${tokenUrl}`);
    
    const response = await fetch(tokenUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: "refresh_token",
        refresh_token: refreshToken,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error("Token refresh failed:", {
        url: tokenUrl,
        status: response.status,
        statusText: response.statusText,
        error: error
      });
      throw new Error(
        `Failed to refresh token: ${response.status} ${response.statusText}`,
      );
    }

    return response.json();
  }

  /**
   * Get a valid access token, refreshing if necessary
   */
  static async getValidAccessToken(companyId: string): Promise<string> {
    // Get current config from database
    const { data: config, error } = await supabaseClient
      .schema("cf_kommo")
      .from("kommo_config")
      .select("*")
      .eq("company_id", companyId)
      .single();

    if (error || !config) {
      throw new Error("Kommo configuration not found");
    }

    // Check if token is expired or about to expire (5 minutes buffer)
    const now = new Date();
    const expiresAt = config.token_expires_at
      ? new Date(config.token_expires_at)
      : null;
    const bufferTime = 5 * 60 * 1000; // 5 minutes in milliseconds

    if (!expiresAt || now.getTime() > expiresAt.getTime() - bufferTime) {
      console.log("Token expired or about to expire, refreshing...");

      try {
        // Refresh the token
        const tokenData = await this.refreshAccessToken(
          config.api_url,
          config.client_id,
          config.client_secret,
          config.refresh_token,
        );

        // Calculate new expiry time
        const newExpiresAt = new Date(
          now.getTime() + tokenData.expires_in * 1000,
        );

        // Update database with new tokens
        const { error: updateError } = await supabaseClient
          .from("kommo_config")
          .update({
            access_token: tokenData.access_token,
            refresh_token: tokenData.refresh_token,
            token_expires_at: newExpiresAt.toISOString(),
            updated_at: now.toISOString(),
          })
          .eq("company_id", companyId);

        if (updateError) {
          console.error("Failed to update tokens in database:", updateError);
          throw new Error("Failed to update tokens in database");
        }

        console.log("Token refreshed successfully");
        return tokenData.access_token;
      } catch (error) {
        console.error("Token refresh failed:", error);
        throw new Error(
          "Failed to refresh access token. Please re-authenticate.",
        );
      }
    }

    return config.access_token;
  }

  /**
   * Make an authenticated request to Kommo API with automatic token refresh
   */
  static async makeAuthenticatedRequest(
    companyId: string,
    url: string,
    options: RequestInit = {},
  ): Promise<Response> {
    try {
      const accessToken = await this.getValidAccessToken(companyId);

      const response = await fetch(url, {
        ...options,
        headers: {
          ...options.headers,
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
          Accept: "application/json",
          "User-Agent": "Mozilla/5.0 (compatible; YourApp/1.0)",
        },
      });

      // If we get 401, try refreshing token once more
      if (response.status === 401) {
        console.log("Got 401, forcing token refresh...");

        // Force refresh by setting expiry to past
        await supabaseClient
          .from("kommo_config")
          .update({
            token_expires_at: new Date(0).toISOString(),
          })
          .eq("company_id", companyId);

        // Get new token and retry
        const newAccessToken = await this.getValidAccessToken(companyId);

        return fetch(url, {
          ...options,
          headers: {
            ...options.headers,
            Authorization: `Bearer ${newAccessToken}`,
            "Content-Type": "application/json",
            Accept: "application/json",
            "User-Agent": "Mozilla/5.0 (compatible; YourApp/1.0)",
          },
        });
      }

      return response;
    } catch (error) {
      console.error("Authenticated request failed:", error);
      throw error;
    }
  }
}
