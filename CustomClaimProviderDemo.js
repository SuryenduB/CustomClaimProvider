//Demo code for custom authentication extensions
//Use with pipedream
//This code should only be used for demo purposes and should not be treated as reliable code


import sql from "mssql"

export default defineComponent({
  async run({ steps, $ }) {
    //const headers = {'Content-Type': 'application/json',}

    // Claims to return to Entra ID
    

    // Query Azure SQL Database for user payment record
    const AZUREAD_LoginName = steps.trigger.event.body.data.authenticationContext.user.userPrincipalName;
   
    const sqlQuery = `SELECT  GSuite_ID FROM [dbo].[UserList] WHERE AZUREAD_LoginName='`+steps.trigger.event.body.data.authenticationContext.user.userPrincipalName+`'`;
    const sqlResult = await executeSqlQuery(sqlQuery);
    
    const body = {
      data: {
        '@odata.type': 'microsoft.graph.onTokenIssuanceStartResponseData',
        actions: [
          {
            '@odata.type': 'microsoft.graph.provideClaimsForToken',
            claims: {
              correlationId: steps.trigger.event.body.data.authenticationContext.correlationId,
              apiVersion: '1.0.0',
              dateOfBirth: sqlResult.GSuite_ID,
              customRoles: ['NewYear2024', 'Writer', 'Reader'],
              upn: steps.trigger.event.body.data.authenticationContext.user.userPrincipalName,
            },
          },
        ],
      },
    }

    
      // Populate claim attributes from SQL table
      //body.data.actions[0].claims.dateOfBirth = sqlResult.EmployeeID;
      //body.data.actions[0].claims.customRoles = sqlResult.customRoles;
    

    await $.respond({
      status: 200,
      headers: { 'Content-Type': 'application/json' },
      body,
    });
  },
});

async function executeSqlQuery(query) {
  // Connect to Azure SQL Database and execute the query
  // Replace the connection details with your own
  const connection = await createSqlConnection();
  const result = await connection.query(query);
  await connection.close();
  console.log(result.recordset[0]);

  // Return the first row of the result as an object
  return result.recordset[0];
}

async function createSqlConnection() {
  // Create a connection to Azure SQL Database
  // Replace the connection details with your own
 
  const config = {
    user: '',
    password: '',
    server: 'demo.database.windows.net',
    database: 'demo',
    options: {
      encrypt: true,
      enableArithAbort: true,
    },
  };

  
  const connection = await sql.connect(config);
  return connection;
}