'use server'

import qs from 'query-string';

const BASE_URL = process.env.COINGECKO_BASE_URL;
const API_KEY = process.env.COINGECKO_API_KEY;

if(!BASE_URL) throw new Error('Could not get base url');
if(!API_KEY) throw new Error('Could not get api key');


/**
 * Fetches JSON from the configured API by building a full URL from a relative endpoint and optional query params.
 *
 * @param endpoint - Relative API path (appended to the configured base URL).
 * @param params - Optional query parameters to include in the request; empty strings and nulls are omitted.
 * @param revalidate - Cache revalidation hint in seconds for the request.
 * @returns The parsed JSON response typed as `T`.
 * @throws Error when the response has a non-OK HTTP status; the error message includes the status code and any error text returned by the API.
 */
export async function fetcher<T>(
    endpoint: string,
    params?: QueryParams,
    revalidate = 60,
): Promise<T> {
    const url = qs.stringifyUrl({
        url: `${BASE_URL}/${endpoint}`,
        query: params,
    }, { skipEmptyString: true, skipNull: true});

    const response = await fetch(url, {
        headers: {
            'x-cg-demo-api-key' : API_KEY,
            'Content-Type': "application/json",
        } as Record<string, string>,
        next: { revalidate }
    });

    if(!response.ok) {
        const errorBody: CoinGeckoErrorBody = await response.json().catch(() => ({}));

        throw new Error(`API Error: ${response.status}: ${errorBody.error || response.statusText} `);
    }

    return response.json();
}

/**
 * Retrieve pool metadata for a token, using network+contractAddress when provided or falling back to a search by `id`.
 *
 * @param id - Token identifier or search query used when network and contractAddress are not both provided
 * @param network - Optional blockchain network identifier to scope the lookup
 * @param contractAddress - Optional token contract address to scope the lookup
 * @returns The first matched `PoolData` when available; otherwise returns a fallback `PoolData` with empty fields (also returned on lookup errors)
 */
export async function getPools(
  id: string,
  network?: string | null,
  contractAddress?: string | null
): Promise<PoolData> {
  const fallback: PoolData = {
    id: "",
    address: "",
    name: "",
    network: "",
  };

  if (network && contractAddress) {
    try {
      const poolData = await fetcher<{ data: PoolData[] }>(
        `onchain/networks/${network}/tokens/${contractAddress}/pools`
      );

      return poolData.data?.[0] ?? fallback;
    } catch(error) {
      console.log(error);
      return fallback;
    }
  }

  try {
    const poolData = await fetcher<{ data: PoolData[] }>(
      "onchain/search/pools",
      { query: id }
    );

    return poolData.data?.[0] ?? fallback;
  } catch {
    return fallback;
  }
}