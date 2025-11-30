import { useEffect, useState } from "react";
import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useStore } from "@/lib/store";
import LoadingScreen from "@/components/loading-screen";
import NotFound from "@/pages/not-found";
import Layout from "@/components/layout";
import Login from "@/pages/login";
import Dashboard from "@/pages/dashboard";
import AdminSites from "@/pages/admin-sites";
import Editor from "@/pages/editor";
import Users from "@/pages/users";
import MyArticles from "@/pages/my-articles";
import Settings from "@/pages/settings";

function Router() {
  const { user, initializeFromStorage } = useStore();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    initializeFromStorage();
    // Show loading screen for 1.5 seconds
    const timer = setTimeout(() => setIsLoading(false), 1500);
    return () => clearTimeout(timer);
  }, [initializeFromStorage]);

  if (isLoading) {
    return <LoadingScreen />;
  }

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

      <Route path="/admin/users">
        <Layout>
          <Users />
        </Layout>
      </Route>
      
      <Route path="/editor/:articleId?">
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
