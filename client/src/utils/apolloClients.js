import { ApolloClient, InMemoryCache, createHttpLink } from '@apollo/client';
import { setContext } from '@apollo/client/link/context';

// Middleware untuk menyisipkan Token ke Header (Authorization)
const authLink = setContext((_, { headers }) => {
  const token = localStorage.getItem('token');
  return {
    headers: {
      ...headers,
      authorization: token ? `Bearer ${token}` : "",
    }
  };
});

// --- CLIENT 1: AUTH SERVICE (Port 4001) ---
export const authClient = new ApolloClient({
  link: authLink.concat(createHttpLink({ uri: 'http://localhost:4001/graphql' })),
  cache: new InMemoryCache(),
});

// --- CLIENT 2: STUDENT SERVICE (Port 4002) ---
export const studentClient = new ApolloClient({
  link: authLink.concat(createHttpLink({ uri: 'http://localhost:4002/graphql' })),
  cache: new InMemoryCache(),
});

// --- CLIENT 3: FINANCE SERVICE (Port 4003) ---
export const financeClient = new ApolloClient({
  link: authLink.concat(createHttpLink({ uri: 'http://localhost:4003/graphql' })),
  cache: new InMemoryCache(),
});

// --- CLIENT 4: ACADEMIC SERVICE (Port 4004) ---
export const academicClient = new ApolloClient({
  link: authLink.concat(createHttpLink({ uri: 'http://localhost:4004/graphql' })),
  cache: new InMemoryCache(),
});