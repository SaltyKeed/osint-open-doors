import "server-only";
import { isIP } from "node:net";

/** The 8 groups of 16 bits of an IPv6 address, or null if it is not one. */
function ipv6Groups(ip: string): number[] | null {
  let text = ip.toLowerCase().split("%")[0]!;
  // Dotted IPv4 at the end (::ffff:1.2.3.4): turned into two groups.
  const dotted = /^(.*:)(\d+\.\d+\.\d+\.\d+)$/.exec(text);
  if (dotted) {
    const octets = dotted[2]!.split(".").map(Number);
    if (octets.some((o) => o > 255)) return null;
    text = `${dotted[1]}${((octets[0]! << 8) | octets[1]!).toString(16)}:${((octets[2]! << 8) | octets[3]!).toString(16)}`;
  }
  const halves = text.split("::");
  if (halves.length > 2) return null;
  const head = halves[0] ? halves[0].split(":") : [];
  const tail = halves.length === 2 && halves[1] ? halves[1].split(":") : [];
  const missing = 8 - head.length - tail.length;
  if (halves.length === 2 ? missing < 1 : missing !== 0) return null;
  const groups = [...head, ...Array<string>(halves.length === 2 ? missing : 0).fill("0"), ...tail].map((g) => Number.parseInt(g, 16));
  return groups.length === 8 && groups.every((g) => g >= 0 && g <= 0xffff) ? groups : null;
}

function isPublicIpv4(a: number, b: number): boolean {
  if (a === 0 || a === 10 || a === 127) return false;
  if (a === 100 && b >= 64 && b <= 127) return false; // CGNAT
  if (a === 169 && b === 254) return false; // link-local
  if (a === 172 && b >= 16 && b <= 31) return false;
  if (a === 192 && b === 168) return false;
  return true;
}

/**
 * True only for an address that belongs to the public internet. Loopback, private, link-local, unique-local,
 * "this network", CGNAT and IPv6 forms that wrap an IPv4 address (mapped, NAT64) are refused. A value that is
 * not an IP address is refused too (T10).
 */
export function isPublicIp(ip: string): boolean {
  const version = isIP(ip.split("%")[0]!);
  if (version === 4) {
    const [a, b] = ip.split(".").map(Number);
    return isPublicIpv4(a!, b!);
  }
  if (version !== 6) return false;
  const g = ipv6Groups(ip);
  if (!g) return false;
  if (g.every((x) => x === 0)) return false; // ::
  if (g.slice(0, 7).every((x) => x === 0) && g[7] === 1) return false; // ::1
  if ((g[0]! & 0xffc0) === 0xfe80) return false; // fe80::/10
  if ((g[0]! & 0xfe00) === 0xfc00) return false; // fc00::/7
  const wrapsIpv4 =
    (g.slice(0, 5).every((x) => x === 0) && g[5] === 0xffff) || // ::ffff:0:0/96, mapped
    (g[0] === 0x64 && g[1] === 0xff9b && g.slice(2, 6).every((x) => x === 0)); // 64:ff9b::/96, NAT64
  if (wrapsIpv4) return isPublicIpv4(g[6]! >> 8, g[6]! & 0xff);
  return true;
}
