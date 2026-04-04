import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import ParentMockCreator from "@/components/ParentMockCreator";
import StudentExamMode from "@/components/StudentExamMode";
import StudentAIMentorChat from "@/components/StudentAIMentorChat";
import ParentExamResults from "@/components/ParentExamResults";
import ParentCreditSettings from "@/components/ParentCreditSettings";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, MessageSquare, BarChart3, Settings } from "lucide-react";

const AIMentorChat = () => {
  const { role } = useAuth();

  if (role === "parent") {
    return <ParentAIMentorView />;
  }

  return <StudentAIMentorWrapper />;
};

const ParentAIMentorView = () => {
  return (
    <Tabs defaultValue="create" className="space-y-4">
      <TabsList className="grid grid-cols-4 h-12">
        <TabsTrigger value="create" className="gap-1 text-xs sm:text-sm">
          <Plus className="h-4 w-4" /><span className="hidden sm:inline">Create Mock</span><span className="sm:hidden">Create</span>
        </TabsTrigger>
        <TabsTrigger value="chat" className="gap-1 text-xs sm:text-sm">
          <MessageSquare className="h-4 w-4" /><span className="hidden sm:inline">Chat with AI</span><span className="sm:hidden">Chat</span>
        </TabsTrigger>
        <TabsTrigger value="results" className="gap-1 text-xs sm:text-sm">
          <BarChart3 className="h-4 w-4" /><span className="hidden sm:inline">Exam Results</span><span className="sm:hidden">Results</span>
        </TabsTrigger>
        <TabsTrigger value="settings" className="gap-1 text-xs sm:text-sm">
          <Settings className="h-4 w-4" /><span className="hidden sm:inline">Credits</span><span className="sm:hidden">Credits</span>
        </TabsTrigger>
      </TabsList>
      <TabsContent value="create"><ParentMockCreator /></TabsContent>
      <TabsContent value="chat"><StudentAIMentorChat /></TabsContent>
      <TabsContent value="results"><ParentExamResults /></TabsContent>
      <TabsContent value="settings"><ParentCreditSettings /></TabsContent>
    </Tabs>
  );
};

const StudentAIMentorWrapper = () => {
  return <StudentAIMentorChat />;
};

export default AIMentorChat;
