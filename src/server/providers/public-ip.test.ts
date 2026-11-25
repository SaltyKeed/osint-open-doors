import { describe, expect, it } from "vitest";
import { isPublicIp } from "./public-ip";

describe("isPublicIp", () => {
  it.each([
    "8.8.8.8",
    "1.1.1.1",
    "172.15.0.1",
    "172.32.0.1",
    "100.63.255.255",
    "100.128.0.1",
    "169.253.1.1",
    "2606:4700:4700::1111",
    "2001:4860:4860::8888",
    "::ffff:8.8.8.8",
    "::ffff:808:808",
  ])("%s is public", (ip) => expect(isPublicIp(ip)).toBe(true));

  it.each([
    "127.0.0.1",
    "127.255.255.254",
    "0.0.0.0",
    "0.1.2.3",
    "10.0.0.1",
    "10.255.255.255",
    "172.16.0.1",
    "172.31.255.255",
    "192.168.1.1",
    "169.254.169.254",
    "100.64.0.1",
    "100.127.255.255",
    "::1",
    "::",
    "fe80::1",
    "febf::1",
    "fc00::1",
    "fd12:3456::1",
    "::ffff:127.0.0.1",
    "::ffff:10.0.0.1",
    "::ffff:192.168.1.1",
    "::ffff:a9fe:a9fe",
    "64:ff9b::7f00:1",
  ])("%s is not public", (ip) => expect(isPublicIp(ip)).toBe(false));

  it.each(["", "pas une ip", "999.1.1.1", "1.2.3"])("%s is not public: not an address", (value) => {
    expect(isPublicIp(value)).toBe(false);
  });
});
