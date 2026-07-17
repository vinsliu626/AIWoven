import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks=vi.hoisted(()=>({requireAnalyticsAdmin:vi.fn(),getOwnerAnalyticsSummary:vi.fn()}));
vi.mock("@/lib/analytics/admin",()=>({requireAnalyticsAdmin:mocks.requireAnalyticsAdmin}));
vi.mock("@/lib/analytics/summary",()=>({getOwnerAnalyticsSummary:mocks.getOwnerAnalyticsSummary}));

describe("GET /api/owner/analytics",()=>{
  beforeEach(()=>{vi.clearAllMocks();vi.resetModules();});
  it("returns 401 when unauthenticated",async()=>{mocks.requireAnalyticsAdmin.mockResolvedValue({ok:false,status:401});const {GET}=await import("@/app/api/owner/analytics/route");const res=await GET(new NextRequest("http://localhost/api/owner/analytics"));expect(res.status).toBe(401);expect(mocks.getOwnerAnalyticsSummary).not.toHaveBeenCalled();});
  it("returns 403 to a normal user",async()=>{mocks.requireAnalyticsAdmin.mockResolvedValue({ok:false,status:403});const {GET}=await import("@/app/api/owner/analytics/route");const res=await GET(new NextRequest("http://localhost/api/owner/analytics"));expect(res.status).toBe(403);});
  it("returns analytics to an owner",async()=>{mocks.requireAnalyticsAdmin.mockResolvedValue({ok:true,status:200,user:{id:"owner"}});mocks.getOwnerAnalyticsSummary.mockResolvedValue({visits:{total:1}});const {GET}=await import("@/app/api/owner/analytics/route");const res=await GET(new NextRequest("http://localhost/api/owner/analytics"));expect(res.status).toBe(200);expect((await res.json()).data.visits.total).toBe(1);});
});
