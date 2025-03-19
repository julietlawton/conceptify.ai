import { Redis } from "@upstash/redis";
import { NextResponse } from "next/server";

const redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL!,
    token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

export async function POST(req: Request) {
    try {
        const { fingerprintId } = await req.json();

        if (!fingerprintId) {
            return NextResponse.json({ error: "Fingerprint ID missing" }, { status: 400 });
        }

        const exists = await redis.exists(fingerprintId);
        if (!exists) {
            return NextResponse.json({ error: "Fingerprint not initialized" }, { status: 400 });
        }

        const newCount = await redis.incr(fingerprintId);
        return NextResponse.json({ fingerprintId, usage: newCount });
    } catch (err) {
        console.error("Error handling fingerprint:", err);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

export const dynamic = 'force-dynamic'