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

        const existingCount = await redis.get<number>(fingerprintId);

        if (existingCount !== null) {
            return NextResponse.json({ fingerprintId, usage: existingCount });
        } else {
            // First time seen, initialize count to 0
            await redis.set(fingerprintId, 0, { ex: 60 * 60 * 24 * 30 }); // Expires in 30 days
            return NextResponse.json({ fingerprintId, usage: 0 });
        }
    } catch (err) {
        console.error("Error handling fingerprint:", err);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

export const dynamic = 'force-dynamic'