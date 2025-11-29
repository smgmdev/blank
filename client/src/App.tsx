import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Layout from "@/components/layout";
import Login from "@/pages/login";
import Dashboard from "@/pages/dashboard";
import AdminSites from "@/pages/admin-sites";
import Editor from "@/pages/editor";

import MyArticles from "@/pages/my-articles";
import Settings from "@/pages/settings";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Login} />
      <Route path="/login" component={Login} />
      
      <Route path="/dashboard">
        <Layout>
          <Dashboard />
        </Layout>
      </Route>

      <Route path="/my-articles">
        <Layout>
          <MyArticles />
        </Layout>
      </Route>
      
      <Route path="/admin/sites">
        <Layout>
          <AdminSites />
        </Layout>
      </Route>
      
      <Route path="/editor">
        <Layout>
          <Editor />
        </Layout>
      </Route>

      <Route path="/settings">
        <Layout>
          <Settings />
        </Layout>
      </Route>

      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
