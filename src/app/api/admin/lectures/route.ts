import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";

export const dynamic = "force-dynamic";

// Listar TODAS as palestras (incluindo inativas)
export async function GET() {
  try {
    const adminDb = getAdminDb();
    const snap = await adminDb.collection("lectures").orderBy("timeSlot", "asc").get();
    const lectures = snap.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    return NextResponse.json({ success: true, data: lectures });
  } catch (error: any) {
    console.error("Erro ao buscar palestras admin:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// Criar nova palestra
export async function POST(request: NextRequest) {
  try {
    const adminDb = getAdminDb();
    const body = await request.json();
    const { title, speaker, description, location, timeSlot, date, maxCapacity, category } = body;

    if (!title || !speaker || !timeSlot || !maxCapacity) {
      return NextResponse.json(
        { success: false, error: "Título, palestrante, horário e limite de vagas são obrigatórios" },
        { status: 400 }
      );
    }

    const payload = {
      title,
      speaker: speaker || "",
      description: description || "",
      location: location || "Auditório Principal",
      timeSlot,
      date: date || "2026-09-15",
      maxCapacity: Number(maxCapacity),
      currentEnrollments: 0,
      category: category || "Outros",
      isActive: true,
      createdAt: FieldValue.serverTimestamp(),
    };

    const docRef = await adminDb.collection("lectures").add(payload);

    return NextResponse.json({
      success: true,
      data: { id: docRef.id, ...payload },
    });
  } catch (error: any) {
    console.error("Erro ao criar palestra:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// Editar palestra existente
export async function PUT(request: NextRequest) {
  try {
    const adminDb = getAdminDb();
    const body = await request.json();
    const { id, ...updateData } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: "ID da palestra é obrigatório" }, { status: 400 });
    }

    if (updateData.maxCapacity) {
      updateData.maxCapacity = Number(updateData.maxCapacity);
    }

    await adminDb.collection("lectures").doc(id).update(updateData);

    return NextResponse.json({ success: true, message: "Palestra atualizada com sucesso" });
  } catch (error: any) {
    console.error("Erro ao atualizar palestra:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// Excluir palestra
export async function DELETE(request: NextRequest) {
  try {
    const adminDb = getAdminDb();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ success: false, error: "ID da palestra é obrigatório" }, { status: 400 });
    }

    await adminDb.collection("lectures").doc(id).delete();

    return NextResponse.json({ success: true, message: "Palestra excluída com sucesso" });
  } catch (error: any) {
    console.error("Erro ao excluir palestra:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
