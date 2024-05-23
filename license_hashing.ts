function generateConsistentSalt(): string {
    // Ya ya, this is not secure in the slightest. Goal is to put up one modicum of effort towards ensuring people purchase
    // And after that I would rather be focused on building and having fun
    // Mind keeping this between us if possible?
    // Would love if you could at least help out my work by tweeting about the plugin instead then.
    const base =
        "pleasebuyartisansoftwarebutalsoallgoodfriend.DMifyouneedsomething.Woudlappreciateyoukeepingthisonthedownlow";
    let salt = "";
    for (let i = 0; i < base.length; i++) {
        const charCode = base.charCodeAt(i);
        const shift = charCode % 3 === 0 ? 3 : charCode % 2 === 0 ? 1 : 2;
        salt += String.fromCharCode(charCode + shift);
    }
    return salt;
}
export function generateHashForUUID(uuid: string): string {
    const salt = generateConsistentSalt(); // Consistently generated, obfuscated salt
    const combined = uuid + salt;
    let hash = 0;
    for (let i = 0; i < combined.length; i++) {
        const char = combined.charCodeAt(i);
        hash = (hash << 5) - hash + char;
        hash = hash & hash; // Convert to 32bit integer
    }
    return hash.toString(16); // Return hash as a hexadecimal string
}
export function validateUUIDHashPair(uuid: string, hash: string): boolean {
    const generatedHash = generateHashForUUID(uuid);
    return generatedHash === hash;
}
export async function validate_license_key(key: string) {
    // ya ya I know here. This is literally a good sheet that has the license keys stored in it.
    // I'm telling you this is not sophisticated anti-piracy.
    // This is what can I do in 30 minutes to put up a speed bump.
    const url = `https://script.google.com/macros/s/AKfycbzIOC4eyZ6ttfhONhBvrZZxYMNAqCT6K4RM-qkyGaCSsQ9yF1RJIxCGysbfMVrazeVfdg/exec?key=${key}`;
    const output = await fetch(url);
    const json = await output.json();
    // Convert string values of 'status' and 'validKey' to actual boolean values
    json.status = json.status === "true";
    json.validKey = json.validKey === "true";
    return json;
}
