"use client";

import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

export interface ConnectedSheetItem {
  spreadsheetId: string;
  title: string;
  sheetName: string;
  url: string;
  addedBy: string;
  createdAt: string;
}

async function fetchConnectedSheets(): Promise<ConnectedSheetItem[]> {
  const res = await fetch("/api/connected-sheets");
  if (!res.ok) throw new Error("Failed to fetch connected sheets");
  const data = await res.json();
  return data.connectedSheets ?? [];
}

export const CONNECTED_SHEETS_QUERY_KEY = ["connected-sheets"] as const;

export function useConnectedSheets() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: CONNECTED_SHEETS_QUERY_KEY,
    queryFn: fetchConnectedSheets,
  });

  // Re-fetch when other components broadcast a sheet_connected event
  useEffect(() => {
    const handler = () => {
      queryClient.invalidateQueries({ queryKey: CONNECTED_SHEETS_QUERY_KEY });
    };
    window.addEventListener("sheet_connected", handler);
    return () => window.removeEventListener("sheet_connected", handler);
  }, [queryClient]);

  return query;
}
