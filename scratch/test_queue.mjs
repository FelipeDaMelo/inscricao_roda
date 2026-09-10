async function testQueue() {
  const lecturesRes = await fetch("http://localhost:3000/api/lectures");
  const lecturesData = await lecturesRes.json();
  const l1 = lecturesData.data[0];
  const l2 = lecturesData.data[1];

  const testStudentId = "10720200063"; // ANA CLARA PINHEIRO MESQUITA

  console.log("1. Solicitando ingresso na Fila Virtual FIFO...");
  const enterRes = await fetch("http://localhost:3000/api/queue", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      studentId: testStudentId,
      lectureIds: [l1.id, l2.id],
    }),
  });

  const enterData = await enterRes.json();
  console.log("   -> Resposta da Fila:", enterData);

  if (!enterData.ticketId) {
    console.error("Falha ao gerar ticket:", enterData);
    return;
  }

  console.log("\n2. Consultando status e posição na fila...");
  let attempts = 0;
  while (attempts < 10) {
    attempts++;
    const statusRes = await fetch(`http://localhost:3000/api/queue?ticketId=${enterData.ticketId}`);
    const statusData = await statusRes.json();
    console.log(`   [Tentativa ${attempts}] Status: ${statusData.status}, Posição: ${statusData.position}, Ingresso: #${statusData.ticketNumber}`);

    if (statusData.status === "completed") {
      console.log("\n🎉 Inscrição processada com sucesso via FIFO!");
      console.log("Registrations:", statusData.data?.registrations?.length);
      break;
    }

    if (statusData.status === "failed") {
      console.log("\n❌ Falha no processamento FIFO:", statusData.error);
      break;
    }

    await new Promise(r => setTimeout(r, 600));
  }

  // 3. Limpeza do estudante de teste
  await fetch("http://localhost:3000/api/register", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      studentId: testStudentId,
      clearAll: true,
      isAdmin: true,
    }),
  });
  console.log("Estudante de teste limpo com sucesso.");
}

testQueue().catch(console.error);
