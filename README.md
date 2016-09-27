# loans-api
It's a backend part of homework for candidates in FE.
## Prerequisites
- [node.js](http://nodejs.org) (at least 5 version)
- [npm](http://npmjs.com) (at least 3 version)
## Installing
```shell
git clone https://bitbucket.org/skankjo/loans-api.git
cd loans-api
npm install
```
## Building and running
```shell
npm run build
node build/index.js
```
The server is accessible by [localhost:3000](http://localhost:3000).
## Running tests
```shell
npm test
```
## API
All the resources, that begin with /client are secured and should be accessed with json web token. The exception is POST /client to save a new client.
### GET /application/constraints
Returns values available to display in the calculator.
### GET /application/offer
Params: amount, term.
Returns calculations, what a client is about to apply for. It should be displayed to a client for him to know what he is going to apply for.
### POST /login
Params: username (email of a client), password.
Returns json web token, that should be provided in the header in order secured resources to be accessible.
Header: Authorization: Bearer {token}
### POST /clients
A resource to save a new client.
Params: name, surname, password, email, personalId.
Returns a new client while success or validation errors otherwise.
### GET /clients
A resource to fetch data of the client currently logged in.
No params.
Returns client's data.
### GET /clients/application
A resource to get the latest application of the current client.
No params.
Returns client's latest application.
### POST /clients/application?amount=${amount}&term=${term}
A resource to apply for a loan. On success it creates an application that should be confirmed later, if a client decides to.
Returns a new application on success or validation errors otherwise. 
### PUT /clients/application
A resource to confirm the latest application of the client.
No params.
Returns a new loan on success or validation errors otherwise.
### GET /clients/loans
A resource to list all client's loans.
No params.
Returns the list of client's loans.
### GET /clients/loans/latest
A resource to get client's latest loan.
No params.
Returns client's latest loan.
