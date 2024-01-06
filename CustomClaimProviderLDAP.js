// Import necessary modules
import ldap from "ldapjs";
import util from "util";

// Export a default component
export default defineComponent({
    async run({ steps, $ }) {
        //From the Previous Step get the Uid
        const AZUREAD_LoginName = steps.trigger.event.body.data.authenticationContext.user.userPrincipalName;
        const uid = AZUREAD_LoginName.split('@')[0];

        // Create the body object with initial data
        const body = {
            data: {
                '@odata.type': 'microsoft.graph.onTokenIssuanceStartResponseData',
                actions: [
                    {
                        '@odata.type': 'microsoft.graph.provideClaimsForToken',
                        claims: {
                            correlationId: steps.trigger.event.body.data.authenticationContext.correlationId,
                            apiVersion: '1.0.0',
                            dateOfBirth: '31/01/2020',
                            telephoneNumber: '123456789',
                            customRoles: ['NewYear2024', 'Writer', 'Reader'],
                            upn: steps.trigger.event.body.data.authenticationContext.user.userPrincipalName,
                        },
                    },
                ],
            },
        };

        try {
            // Create an LDAP client
            const client = ldap.createClient({
                url: 'ldap://ldap.forumsys.com:389',
            });

            // Set the bind DN and password
            const bindDN = 'cn=read-only-admin,dc=example,dc=com';
            const bindPassword = 'password';

            // Promisify the bind and search functions
            const bindAsync = util.promisify(client.bind.bind(client));
            const searchAsync = util.promisify(client.search.bind(client));

            // Bind to the LDAP server
            await bindAsync(bindDN, bindPassword);

            // Declare a variable to store the telephone number
            let telephoneNumber;

            // Set the search options
            const opts = {
                filter: `(uid=${uid})`,
                scope: 'sub'
            };

            // Perform the LDAP search
            const res = await searchAsync('dc=example,dc=com', opts);

            // Handle search events
            res.on('searchRequest', (searchRequest) => {
                console.log('searchRequest: ', searchRequest.messageId);
            });

            res.on('searchEntry', (entry) => {
                console.log('entry: ' + JSON.stringify(entry.pojo));
                const result = entry.pojo;
                const telephoneNumberAttribute = result.attributes.find((attribute) => attribute.type === 'telephoneNumber');
                telephoneNumber = telephoneNumberAttribute ? telephoneNumberAttribute.values[0] : null;
            });

            res.on('searchReference', (referral) => {
                console.log('referral: ' + referral.uris.join());
            });

            res.on('error', (err) => {
                console.error('error: ' + err.message);
            });

            res.on('end', (result) => {
                console.log('status: ' + result.status);
            });

            // Wait for the LDAP operation to complete
            await new Promise((resolve) => {
                res.on('end', () => {
                    resolve();
                });
            });

            // Update the telephoneNumber claim in the body object if it was found
            if (telephoneNumber) {
                body.data.actions[0].claims.telephoneNumber = telephoneNumber;

            }


        }
        catch (error) {
            console.error('LDAP operation failed:', error);
        }

        // Respond with the updated body object
        await $.respond({
            status: 200,
            headers: { 'Content-Type': 'application/json' },
            body,
        });
    },
});
