export abstract class DataUpdater {
    abstract query: string;

    async getData(bulletToken: string) {
        return fetch(process.env.SPLATOON3_BASE_URL + "/api/graphql", {
            method: "POST",
            headers: {
                Authorization: `Bearer ${bulletToken}`,
                "X-Web-View-Ver": "2.0.0-8a061f6c",
                "Content-Type": "application/json",
                "Accept-Language": "ja-jp",
            },
            body: JSON.stringify({
                extensions: {
                    persistedQuery: {
                        version: 1,
                        sha256Hash: this.query,
                    },
                },
            }),
        });
    }

    abstract update(): Promise<{}>;
}
