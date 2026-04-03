import { useAuth } from "@/hooks/useAuth";
import ParentMockCreator from "@/components/ParentMockCreator";
import StudentExamMode from "@/components/StudentExamMode";
import StudentAIMentorChat from "@/components/StudentAIMentorChat";

const AIMentorChat = () => {
  const { role } = useAuth();

  if (role === "parent") {
    return <ParentMockCreator />;
  }

  return <StudentAIMentorWrapper />;
};

const StudentAIMentorWrapper = () => {
  return <StudentAIMentorChat />;
};

export default AIMentorChat;
