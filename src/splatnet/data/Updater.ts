export abstract class DataUpdater {
    abstract query: string;

    async getData(bulletToken: string) {
        const headers = {
            Authorization: `Bearer ${bulletToken}`,
            "X-Web-View-Ver": "2.0.0-bd36a652",
            "Content-Type": "application/json",
            "Accept-Language": "ja-jp",
        };

        console.log(headers);
        return fetch(process.env.SPLATOON3_BASE_URL + "/api/graphql", {
            method: "POST",
            headers: headers,
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
