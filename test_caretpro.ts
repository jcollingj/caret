const BASE_URL = "http://localhost:8080";
const TRIGGER_ID = "trigger_50a37b15-3bf1-4709-be6c-46096a642f8f";
const USER_ID = process.env.USER_ID || "";

if (!USER_ID) {
    console.error("USER_ID environment variable is not set");
}

export async function triggerSkillRun(user_query: string) {
    try {
        const response = await fetch(`${BASE_URL}/triggers/run`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                id: TRIGGER_ID,
                user_id: USER_ID,
                data: {
                    user_query,
                },
            }),
        });
        const data = await response.json();
        return data.skill_run_id;
    } catch (error) {
        console.error("Error triggering skill run:", error);
        throw error;
    }
}

export async function pollSkillRunStatus(skillRunId: string) {
    let checkCount = 0;
    console.log("Starting to poll skill run status...");
    while (true) {
        try {
            checkCount++;
            console.log(`Check #${checkCount}: Fetching skill run status...`);
            const response = await fetch(`${BASE_URL}/skill_runs/beta/${skillRunId}`);
            const data = await response.json();

            console.log(`Current status: ${data.status}`);

            if (data.status === "Completed") {
                console.log(data);
                return data;
            }

            console.log("Waiting for 5 seconds before next check...");
            await new Promise((resolve) => setTimeout(resolve, 5000)); // Wait for 5 seconds
        } catch (error) {
            console.error(`Error polling skill run status (Check #${checkCount}):`, error);
            throw error;
        }
    }
}

// const skillRunId = await triggerSkillRun();
// console.log("Skill run triggered. ID:", skillRunId);
// await pollSkillRunStatus(skillRunId);
