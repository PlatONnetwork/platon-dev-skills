import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { lookupToken } from "../scripts/lib/commands/lookup-token.ts";
import { getTokens } from "../scripts/lib/commands/get-tokens.ts";
import { getTransaction } from "../scripts/lib/commands/get-transaction.ts";
import { getTransactionLogs } from "../scripts/lib/commands/get-transaction-logs.ts";
import { getContractAbi } from "../scripts/lib/commands/get-contract-abi.ts";
import { inspectContract } from "../scripts/lib/commands/inspect-contract.ts";
import { getAddressLogs } from "../scripts/lib/commands/get-address-logs.ts";
import { getTransactions } from "../scripts/lib/commands/get-transactions.ts";
import { getTokenTransfers } from "../scripts/lib/commands/get-token-transfers.ts";
import { failure, success } from "../scripts/lib/format.ts";
import { getPaginationEnvelope } from "../scripts/lib/pagination.ts";
import { assertAddress, assertTxHash, parsePageSize } from "../scripts/lib/validate.ts";

type JsonObject = Record<string, unknown>;

const fixtureCache = new Map<string, unknown>();

async function fixture(name: string): Promise<unknown> {
  if (!fixtureCache.has(name)) {
    const text = await readFile(new URL(`./fixtures/${name}`, import.meta.url), "utf8");
    fixtureCache.set(name, JSON.parse(text));
  }
  return fixtureCache.get(name);
}

function withMockFetch(payload: unknown, fn: () => Promise<void>): Promise<void> {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () =>
    new Response(JSON.stringify(payload), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  return fn().finally(() => {
    globalThis.fetch = originalFetch;
  });
}

function withDynamicMockFetch(
  responder: (url: URL) => unknown,
  fn: () => Promise<void>,
): Promise<void> {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (input) => {
    const requestUrl =
      typeof input === "string"
        ? new URL(input)
        : input instanceof URL
          ? input
          : new URL(input.url);
    return new Response(JSON.stringify(responder(requestUrl)), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  };
  return fn().finally(() => {
    globalThis.fetch = originalFetch;
  });
}

test("lookup-token maps address_hash search results", async () => {
  const payload = await fixture("search-usdt.json");
  await withMockFetch(payload, async () => {
    const result = await lookupToken(
      { command: "lookup-token", network: "mainnet", raw: false },
      "USDT",
      2,
    );

    assert.deepEqual(result.data, {
      query: "USDT",
      items: [
        {
          address: "0xeac734fb7581D8eB2CE4949B0896FC4E76769509",
          name: "Tether USD",
          symbol: "USDT",
          token_type: "ERC-20",
          decimals: null,
          total_supply: "178368863786",
          exchange_rate: null,
        },
        {
          address: "0x6a2d262D56735DbA19Dd70682B39F6bE9a931D98",
          name: "Tether USD",
          symbol: "USDT",
          token_type: "ERC-20",
          decimals: null,
          total_supply: "16173026737",
          exchange_rate: null,
        },
      ],
      total_returned: 2,
    });
  });
});

test("get-tokens maps token.address_hash and value", async () => {
  const payload = await fixture("address-tokens.json");
  await withMockFetch(payload, async () => {
    const result = await getTokens(
      { command: "get-tokens", network: "mainnet", raw: false },
      "0xd17A883640B25075dEE4A1e8eD12F1C25a2ea5b7",
      10,
    );

    assert.equal(result.pagination?.has_next, false);
    assert.deepEqual(result.data, {
      address: "0xd17A883640B25075dEE4A1e8eD12F1C25a2ea5b7",
      items: [
        {
          address: "0x3795C36e7D12A8c252A20C5a7B455f7c57b60283",
          name: "Dai Stablecoin",
          symbol: "DAI",
          decimals: "18",
          total_supply: "15074449147022542429113",
          exchange_rate: null,
          balance: "168499813001863533",
        },
        {
          address: "0xeac734fb7581D8eB2CE4949B0896FC4E76769509",
          name: "Tether USD",
          symbol: "USDT",
          decimals: "6",
          total_supply: "178368863786",
          exchange_rate: null,
          balance: "746096",
        },
      ],
      total_returned: 2,
    });
  });
});

test("get-transaction maps decoded input, token transfer value, and raw_input", async () => {
  const payload = await fixture("transaction.json");
  await withMockFetch(payload, async () => {
    const result = await getTransaction(
      { command: "get-transaction", network: "mainnet", raw: true },
      "0xd7fafb0eb6ae081594d8fcafbce60c0888fbf54c526c6b81b21e8f3c67dc50a3",
    );

    const data = result.data as { normalized: JsonObject; raw: unknown };
    assert.equal(data.normalized.method, "workMyDirefulOwner(uint256 arg0, uint256 arg1)");
    assert.equal(data.normalized.raw_input, "0xa9059cbb000000000000000000000000d17a883640b25075dee4a1e8ed12f1c25a2ea5b700000000000000000000000000000000000000000000000000000000000b6270");
    assert.deepEqual(data.normalized.token_transfers, [
      {
        from: "0xE7306Af0cF4efFfEbd93e9B68e42Ce35739794E0",
        to: "0xd17A883640B25075dEE4A1e8eD12F1C25a2ea5b7",
        value: "746096",
        token: {
          address: "0xeac734fb7581D8eB2CE4949B0896FC4E76769509",
          symbol: "USDT",
          name: "Tether USD",
        },
      },
    ]);
    assert.equal((data.raw as JsonObject).hash, "0xd7fafb0eb6ae081594d8fcafbce60c0888fbf54c526c6b81b21e8f3c67dc50a3");
  });
});

test("verified contract paths expose abi and merged source file list", async () => {
  const payload = await fixture("verified-contract.json");
  await withMockFetch(payload, async () => {
    const abiResult = await getContractAbi(
      { command: "get-contract-abi", network: "mainnet", raw: false },
      "0xF4A07d980A56f67F6ea178c3918B21DCAE1b4E50",
    );
    const inspectResult = await inspectContract(
      { command: "inspect-contract", network: "mainnet", raw: false },
      "0xF4A07d980A56f67F6ea178c3918B21DCAE1b4E50",
    );
    const fileResult = await inspectContract(
      { command: "inspect-contract", network: "mainnet", raw: false },
      "0xF4A07d980A56f67F6ea178c3918B21DCAE1b4E50",
      "src/interfaces/IPacketConsumerProxy.sol",
    );

    assert.equal((abiResult.data as JsonObject).contract_name, "PacketConsumerProxyConverter");
    assert.equal(Array.isArray((abiResult.data as JsonObject).abi), true);

    assert.deepEqual((inspectResult.data as JsonObject).source_files, [
      "contract.sol",
      "src/abstracts/StdReferenceBase.sol",
      "src/interfaces/IPacketConsumerProxy.sol",
    ]);
    assert.equal((inspectResult.data as JsonObject).has_abi, true);
    assert.equal((fileResult.data as JsonObject).file_name, "src/interfaces/IPacketConsumerProxy.sol");
    assert.match(String((fileResult.data as JsonObject).file_content), /interface IPacketConsumerProxy/);
  });
});

test("get-transaction-logs maps nested address and pagination", async () => {
  const payload = await fixture("transaction-logs.json");
  await withMockFetch(payload, async () => {
    const result = await getTransactionLogs(
      { command: "get-transaction-logs", network: "mainnet", raw: false },
      "0xd7fafb0eb6ae081594d8fcafbce60c0888fbf54c526c6b81b21e8f3c67dc50a3",
      1,
    );

    assert.deepEqual(result.pagination, {
      next_cursor: JSON.stringify({
        kind: "log_page_v1",
        upstream: {
          block_number: 143967685,
          index: 0,
          items_count: 1,
        },
        offset: 0,
      }),
      has_next: true,
    });
    assert.deepEqual(result.data, {
      transaction_hash: "0xd7fafb0eb6ae081594d8fcafbce60c0888fbf54c526c6b81b21e8f3c67dc50a3",
      items: [
        {
          address: "0xeac734fb7581D8eB2CE4949B0896FC4E76769509",
          block_number: 143967685,
          index: 0,
          topics: [
            "0xddf252ad",
            "0x000000000000000000000000e7306af0cf4efffebd93e9b68e42ce35739794e0",
            "0x000000000000000000000000d17a883640b25075dee4a1e8ed12f1c25a2ea5b7",
          ],
          data: "0x00000000000000000000000000000000000000000000000000000000000b6270",
          decoded: {
            method_call: "Transfer(address indexed from, address indexed to, uint256 value)",
            method_id: "ddf252ad",
            parameters: [
              {
                name: "from",
                type: "address",
                value: "0xE7306Af0cF4efFfEbd93e9B68e42Ce35739794E0",
                indexed: true,
              },
            ],
          },
          data_truncated: false,
        },
      ],
      total_returned: 1,
    });
  });
});

test("get-address-logs maps address-emitted logs", async () => {
  const payload = await fixture("address-logs.json");
  await withMockFetch(payload, async () => {
    const result = await getAddressLogs(
      { command: "get-address-logs", network: "mainnet", raw: false },
      "0xeac734fb7581D8eB2CE4949B0896FC4E76769509",
      10,
    );

    assert.deepEqual(result.pagination, {
      next_cursor: null,
      has_next: false,
    });
    assert.deepEqual(result.data, {
      address: "0xeac734fb7581D8eB2CE4949B0896FC4E76769509",
      items: [
        {
          block_number: 143967685,
          transaction_hash: "0xd7fafb0eb6ae081594d8fcafbce60c0888fbf54c526c6b81b21e8f3c67dc50a3",
          index: 0,
          topics: [
            "0xddf252ad",
            "0x000000000000000000000000e7306af0cf4efffebd93e9b68e42ce35739794e0",
            "0x000000000000000000000000d17a883640b25075dee4a1e8ed12f1c25a2ea5b7",
          ],
          data: "0x00000000000000000000000000000000000000000000000000000000000b6270",
          decoded: {
            method_call: "Transfer(address indexed from, address indexed to, uint256 value)",
            method_id: "ddf252ad",
          },
          data_truncated: false,
        },
      ],
      total_returned: 1,
    });
  });
});

test("get-address-logs paginates locally without duplicates when upstream ignores items_count", async () => {
  const firstBatch = {
    items: [
      { block_number: 3, transaction_hash: "0xaaa", topics: ["0x1"], data: "0x01", decoded: null, index: 0 },
      { block_number: 2, transaction_hash: "0xbbb", topics: ["0x2"], data: "0x02", decoded: null, index: 1 },
      { block_number: 1, transaction_hash: "0xccc", topics: ["0x3"], data: "0x03", decoded: null, index: 2 },
    ],
    next_page_params: { block_number: 1, index: 2, items_count: 50 },
  };
  const secondBatch = {
    items: [
      { block_number: 0, transaction_hash: "0xddd", topics: ["0x4"], data: "0x04", decoded: null, index: 0 },
      { block_number: 0, transaction_hash: "0xeee", topics: ["0x5"], data: "0x05", decoded: null, index: 1 },
    ],
    next_page_params: null,
  };

  await withDynamicMockFetch((url) => {
    const blockNumber = url.searchParams.get("block_number");
    return blockNumber === "1" ? secondBatch : firstBatch;
  }, async () => {
    const page1 = await getAddressLogs(
      { command: "get-address-logs", network: "mainnet", raw: false },
      "0xeac734fb7581D8eB2CE4949B0896FC4E76769509",
      2,
    );
    const page2 = await getAddressLogs(
      { command: "get-address-logs", network: "mainnet", raw: false },
      "0xeac734fb7581D8eB2CE4949B0896FC4E76769509",
      2,
      page1.pagination?.next_cursor,
    );
    const page3 = await getAddressLogs(
      { command: "get-address-logs", network: "mainnet", raw: false },
      "0xeac734fb7581D8eB2CE4949B0896FC4E76769509",
      2,
      page2.pagination?.next_cursor,
    );

    const hashes = [
      ...((page1.data as JsonObject).items as JsonObject[]).map((item) => item.transaction_hash),
      ...((page2.data as JsonObject).items as JsonObject[]).map((item) => item.transaction_hash),
      ...((page3.data as JsonObject).items as JsonObject[]).map((item) => item.transaction_hash),
    ];

    assert.deepEqual(hashes, ["0xaaa", "0xbbb", "0xccc", "0xddd", "0xeee"]);
    assert.equal(new Set(hashes).size, hashes.length);
    assert.equal(page1.pagination?.has_next, true);
    assert.equal(page2.pagination?.has_next, true);
    assert.equal(page3.pagination?.has_next, false);
  });
});

test("get-transactions maps advanced filters response and next_page_params", async () => {
  const payload = await fixture("advanced-transactions.json");
  await withMockFetch(payload, async () => {
    const result = await getTransactions(
      { command: "get-transactions", network: "mainnet", raw: false },
      "0xDF66EC4Df18a770E82e999C68c2C0D737a5949Fc",
      "2026-03-15T00:00:00Z",
      undefined,
      undefined,
      2,
    );

    assert.deepEqual(result.pagination, {
      next_cursor: JSON.stringify({
        block_number: 143873955,
        index: 0,
        items_count: 2,
      }),
      has_next: true,
    });
    assert.deepEqual(result.data, {
      address: "0xDF66EC4Df18a770E82e999C68c2C0D737a5949Fc",
      age_from: "2026-03-15T00:00:00Z",
      age_to: null,
      methods: null,
      items: [
        {
          block_number: 143873980,
          transaction_hash: "0x1af4ba6f58d0d9b2da8a8727d31b4190b3e1c93a7af932eddef8c276417cc428",
          timestamp: "2026-03-15T03:32:46.000000Z",
          from: "0xDF66EC4Df18a770E82e999C68c2C0D737a5949Fc",
          to: "0x79b50a9d735662e0C8c89CaD2E39a0fc1680d5a7",
          value: "139593465435080000000000",
          type: "coin_transfer",
          method: null,
        },
        {
          block_number: 143873955,
          transaction_hash: "0x2fac57ddb76bfa270e63c3548384004ae5c8c8879af1c748b090a138442e91fb",
          timestamp: "2026-03-15T03:32:19.000000Z",
          from: "0x07D7baDd5aBcc00B29f9ebc1d4EC199ED54FcB2e",
          to: "0xDF66EC4Df18a770E82e999C68c2C0D737a5949Fc",
          value: "21865281471610000000000",
          type: "coin_transfer",
          method: null,
        },
      ],
      total_returned: 2,
    });
  });
});

test("get-token-transfers maps token metadata and total.value", async () => {
  const payload = await fixture("advanced-token-transfers.json");
  await withMockFetch(payload, async () => {
    const result = await getTokenTransfers(
      { command: "get-token-transfers", network: "mainnet", raw: false },
      "0xd17A883640B25075dEE4A1e8eD12F1C25a2ea5b7",
      "2026-03-16T00:00:00Z",
      undefined,
      undefined,
      10,
    );

    assert.deepEqual(result.pagination, {
      next_cursor: null,
      has_next: false,
    });
    assert.deepEqual(result.data, {
      address: "0xd17A883640B25075dEE4A1e8eD12F1C25a2ea5b7",
      age_from: "2026-03-16T00:00:00Z",
      age_to: null,
      token: null,
      items: [
        {
          block_number: 143967685,
          transaction_hash: "0xd7fafb0eb6ae081594d8fcafbce60c0888fbf54c526c6b81b21e8f3c67dc50a3",
          timestamp: "2026-03-16T07:16:23.000000Z",
          from: "0xE7306Af0cF4efFfEbd93e9B68e42Ce35739794E0",
          to: "0xd17A883640B25075dEE4A1e8eD12F1C25a2ea5b7",
          value: "746096",
          token: {
            address: "0xeac734fb7581D8eB2CE4949B0896FC4E76769509",
            symbol: "USDT",
            name: "Tether USD",
          },
        },
      ],
      total_returned: 1,
    });
  });
});

test("pagination extracts next_page_params as next_cursor", async () => {
  const payload = await fixture("search-usdt.json");
  assert.deepEqual(getPaginationEnvelope(payload), {
    next_cursor: JSON.stringify({
      next_page_params_type: "search",
      q: "USDT",
    }),
    has_next: true,
  });
});

test("validation helpers reject malformed inputs", () => {
  assert.equal(assertAddress("0x0000000000000000000000000000000000000000"), "0x0000000000000000000000000000000000000000");
  assert.equal(assertTxHash("0x" + "1".repeat(64)), "0x" + "1".repeat(64));
  assert.equal(parsePageSize("10"), 10);

  assert.throws(() => assertAddress("nope"), /Invalid address/);
  assert.throws(() => assertTxHash("0x1234"), /Invalid transaction hash/);
  assert.throws(() => parsePageSize("101"), /Invalid page size/);
});

test("format helpers emit stable envelopes", () => {
  const ok = success("lookup-token", "mainnet", { items: [] });
  const err = failure("get-contract-abi", "devnet", "NOT_FOUND", "missing");

  assert.equal(ok.meta.command, "lookup-token");
  assert.equal(ok.meta.network, "mainnet");
  assert.equal(ok.meta.source, "blockscout");
  assert.match(ok.meta.timestamp, /^\d{4}-\d{2}-\d{2}T/);

  assert.deepEqual(err, {
    error: { code: "NOT_FOUND", message: "missing" },
    meta: {
      command: "get-contract-abi",
      network: "devnet",
      source: "blockscout",
    },
  });
});
