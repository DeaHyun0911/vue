import { computed, inject } from 'vue';

export function useFormField(props, emit) {
    const formModel = inject('formModel', null);

    const innerValue = computed({
        get() {
            // If 'field' prop is provided and we are inside a CtvForm (providing formModel),
            // we use the implicit binding.
            if (props.field && formModel && formModel.value && formModel.value[props.field] !== undefined) {
                return formModel.value[props.field];
            }
            // Fallback to v-model
            return props.modelValue;
        },
        set(val) {
            if (props.field && formModel && formModel.value) {
                formModel.value[props.field] = val;
            }
            emit('update:modelValue', val);
        }
    });

    /**
     * 폼 필드 blur 이벤트 핸들러 (그리드 동기화용)
     * 모든 폼 컴포넌트에서 blur 시 호출하여 그리드와 동기화
     */
    const onFormFieldBlur = () => {
        if (typeof window !== 'undefined' && formModel) {
            window.dispatchEvent(new CustomEvent('ctv-form-field-blur', {
                detail: {
                    formModel: formModel.value,
                    field: props.field
                }
            }));
        }
    };

    return {
        innerValue,
        onFormFieldBlur
    };
}
