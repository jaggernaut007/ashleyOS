/**
 * POST /api/board/search - Search board artifacts via RAG
 */

import { NextRequest, NextResponse } from "next/server";
import { boardStore } from "@/lib/boardStore";
import { vectorIndex } from "@/lib/vectorIndex";
import { SearchBoardRequest } from "@/types/board";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const searchReq = body as SearchBoardRequest;

    // Re-index current artifacts for fresh search
    const board = boardStore.getBoard();
    vectorIndex.clear();
    board.artifacts.forEach((a) => vectorIndex.indexArtifact(a));
    board.artifacts.forEach((af) => {
      // Check if any uploaded files should be indexed
      // This would be populated during upload
    });

    // Execute search
    const results = vectorIndex.search(
      searchReq.query,
      searchReq.limit || 10,
      searchReq.type
    );

    // Enrich results with full artifact data
    const enrichedResults = results
      .map((r) => boardStore.getArtifact(r.id))
      .filter((a) => a !== undefined) as typeof board.artifacts;

    return NextResponse.json({
      results: enrichedResults,
      total: enrichedResults.length,
    });
  } catch (error) {
    console.error("Error during search:", error);
    return NextResponse.json(
      { error: "Failed to search" },
      { status: 500 }
    );
  }
}
