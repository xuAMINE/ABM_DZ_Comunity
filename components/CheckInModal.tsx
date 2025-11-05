import React from "react";
import { Modal, View, Text, Button } from "react-native";
import { updateUserStatus, notifyFavorites } from "../lib/checkIn";

interface CheckInModalProps {
    visible: boolean;
    userId: string;
    onClose: () => void;
}

export const CheckInModal = ({ visible, userId, onClose }: CheckInModalProps) => {
    const handleResponse = async (status: "okay" | "not okay") => {
        await updateUserStatus(userId, status);
        await notifyFavorites(userId, status);
        onClose();
    };

    return (
        <Modal visible={visible} transparent animationType="fade">
            <View className="flex-1 justify-center items-center bg-black/50">
                <View className="bg-white p-6 rounded-2xl w-4/5 shadow-lg">
                    <Text className="text-lg font-bold mb-4 text-center">Are you okay?</Text>
                    <Button title="Yes, I'm okay ✅" onPress={() => handleResponse("okay")} />
                    <View style={{ height: 10 }} />
                    <Button title="Not really ❌" onPress={() => handleResponse("not okay")} />
                </View>
            </View>
        </Modal>
    );
};
