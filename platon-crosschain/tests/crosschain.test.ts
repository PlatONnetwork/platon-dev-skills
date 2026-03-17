import test from "node:test";
import assert from "node:assert/strict";

import bridgeDefaults from "./fixtures/bridge-defaults-mainnet.json" with { type: "json" };
import transactionList from "./fixtures/transaction-list-mainnet.json" with { type: "json" };
import transactionDetail from "./fixtures/transaction-detail-mainnet.json" with { type: "json" };

import {
  buildInspectData,
  normalizeRoute,
  normalizeStatus,
  normalizeTransaction,
  routeSummary,
  type RawBridgeRoute,
  type RawTransactionItem,
} from "../scripts/crosschain.ts";

test("normalizeRoute filters inactive assets and maps contracts", () => {
  const route = normalizeRoute((bridgeDefaults.data as RawBridgeRoute[])[0]);

  assert.equal(route.bridge_code, "Ethereum-PlatON");
  assert.equal(route.assets.length, 1);
  assert.equal(route.assets[0].source_symbol, "ETH");
  assert.equal(route.assets[0].source_token_type_label, "native");
  assert.equal(route.assets[0].target_token_type_label, "erc20");
  assert.equal(route.src_proxy_contract, "0xfb7b22ca585a2B400BE99F7F2a2282724C7b54D3");
});

test("routeSummary narrows assets by symbol", () => {
  const route = normalizeRoute((bridgeDefaults.data as RawBridgeRoute[])[0]);
  const summary = routeSummary(route, "ETH") as {
    assets: Array<{ source_symbol: string }>;
    src_chain: Record<string, unknown>;
    dest_chain: Record<string, unknown>;
  };

  assert.equal(summary.assets.length, 1);
  assert.equal(summary.assets[0].source_symbol, "ETH");
  assert.equal("rpc_url" in summary.src_chain, false);
  assert.equal("ws_url" in summary.dest_chain, false);
});

test("routeSummary without symbol also hides rpc fields", () => {
  const route = normalizeRoute((bridgeDefaults.data as RawBridgeRoute[])[0]);
  const summary = routeSummary(route) as {
    src_chain: Record<string, unknown>;
    dest_chain: Record<string, unknown>;
  };

  assert.equal("rpc_url" in summary.src_chain, false);
  assert.equal("ws_url" in summary.src_chain, false);
  assert.equal("rpc_url" in summary.dest_chain, false);
  assert.equal("ws_url" in summary.dest_chain, false);
});

test("normalizeTransaction maps list item status and pending ids", () => {
  const item = (transactionList.data.items as RawTransactionItem[])[0];
  const normalized = normalizeTransaction(item) as Record<string, unknown>;

  assert.equal(normalized.status, "success");
  assert.equal(normalized.event_type, "withdraw");
  assert.deepEqual(normalized.remote_pending_transaction_ids, [
    "0xc0aa651a7f94b49fe7186580d06f2d59461e8b770a590ce41a8ad5416b1085f2",
  ]);
});

test("normalizeTransaction can backfill requested event ids for detail response", () => {
  const normalized = normalizeTransaction(transactionDetail.data as RawTransactionItem, {
    eventHistoryId: 2401,
    eventHistoryPendingId: null,
  }) as Record<string, unknown>;

  assert.equal(normalized.event_history_id, 2401);
  assert.equal(normalized.event_history_pending_id, null);
  assert.equal(normalized.status, "success");
});

test("buildInspectData returns cast guidance for selected asset", () => {
  const route = normalizeRoute((bridgeDefaults.data as RawBridgeRoute[])[0]);
  const inspect = buildInspectData(route, "ETH") as {
    selected_asset: { source_symbol: string };
    rpc_lookup_hint: { source_chainlist_query: string; destination_chainlist_query: string };
    cast_call_examples: { source: string[]; target: string[] };
    write_guidance: { lock_asset: { method: string } };
  };

  assert.equal(inspect.selected_asset.source_symbol, "ETH");
  assert.match(inspect.cast_call_examples.source[0], /nativeSymbol\(\)/);
  assert.match(inspect.cast_call_examples.target[3], /getTokenFee\(string\)/);
  assert.match(inspect.cast_call_examples.source[0], /<SOURCE_RPC_URL>/);
  assert.match(inspect.cast_call_examples.target[0], /<DESTINATION_RPC_URL>/);
  assert.equal(inspect.rpc_lookup_hint.source_chainlist_query, "Ethereum Mainnet");
  assert.equal(inspect.write_guidance.lock_asset.method, "lockAsset(address,string,uint256)");
});

test("normalizeStatus preserves unknown values", () => {
  assert.equal(normalizeStatus("2"), "reviewing");
  assert.equal(normalizeStatus("9"), "9");
  assert.equal(normalizeStatus(undefined), "unknown");
});
