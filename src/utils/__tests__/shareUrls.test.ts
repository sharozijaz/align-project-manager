import { describe, expect, it } from "vitest";
import { openExternalUrl } from "../../integrations/desktop/runtime";

describe("openExternalUrl", () => {
  it("rejects unsupported protocols before handing links to the browser or desktop shell", async () => {
    await expect(openExternalUrl("javascript:alert(1)")).rejects.toThrow("Unsupported external URL.");
  });
});
