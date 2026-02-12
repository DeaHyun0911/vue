/**
 * 컴포넌트 레지스트리
 * 컴포넌트 간 통신을 위한 전역 레지스트리
 */
class ComponentRegistry {
    constructor() {
        this.components = new Map();
        this.activeComponents = new Map(); // 그룹별 활성 컴포넌트 ID 저장 { groupName: componentId }
        this.listeners = new Map(); // 이벤트 리스너 { groupName: [callback] }
    }

    /**
     * 컴포넌트 등록
     * @param {string} id - 컴포넌트 고유 ID
     * @param {object} component - 컴포넌트 인스턴스 정보
     */
    register(id, component) {
        this.components.set(id, component);
    }

    /**
     * 컴포넌트 등록 해제
     * @param {string} id - 컴포넌트 고유 ID
     */
    unregister(id) {
        // 활성 상태 정리
        const component = this.components.get(id);
        if (component && component.group) {
            if (this.activeComponents.get(component.group) === id) {
                this.activeComponents.delete(component.group);
            }
        }
        this.components.delete(id);
    }

    /**
     * ID로 컴포넌트 가져오기
     * @param {string} id - 컴포넌트 고유 ID
     * @returns {object|undefined} 컴포넌트 인스턴스
     */
    get(id) {
        return this.components.get(id);
    }

    /**
     * 그룹으로 컴포넌트 목록 가져오기
     * @param {string} group - 그룹 ID
     * @returns {array} 컴포넌트 인스턴스 배열
     */
    getByGroup(group) {
        const components = [];
        this.components.forEach((component, id) => {
            if (component.group === group) {
                components.push(component);
            }
        });
        return components;
    }

    /**
     * 그룹 내 활성 컴포넌트 설정
     * @param {string} group - 그룹 ID
     * @param {string} id - 컴포넌트 ID
     */
    setActive(group, id) {
        if (!group || !id) return;
        this.activeComponents.set(group, id);
        this.notifyListeners(group, id);
    }

    /**
     * 그룹 이벤트 구독
     * @param {string} group - 그룹 ID
     * @param {function} callback - 콜백 함수 (activeId) => {}
     */
    subscribe(group, callback) {
        if (!this.listeners.has(group)) {
            this.listeners.set(group, []);
        }
        this.listeners.get(group).push(callback);
    }

    /**
     * 리스너 알림
     * @param {string} group 
     * @param {string} activeId 
     */
    notifyListeners(group, activeId) {
        if (this.listeners.has(group)) {
            this.listeners.get(group).forEach(callback => callback(activeId));
        }
    }

    /**
     * 그룹 내 활성 컴포넌트 가져오기
     * @param {string} group - 그룹 ID
     * @returns {object|undefined} 활성 컴포넌트 인스턴스 (없으면 첫 번째 컴포넌트 반환)
     */
    getActive(group) {
        const activeId = this.activeComponents.get(group);
        if (activeId) {
            return this.get(activeId);
        }

        // 활성 컴포넌트가 없으면 해당 그룹의 첫 번째 컴포넌트를 반환 (기본값)
        const groupComponents = this.getByGroup(group);
        return groupComponents.length > 0 ? groupComponents[0] : undefined;
    }

    /**
     * 모든 컴포넌트 가져오기
     * @returns {Map} 전체 컴포넌트 맵
     */
    getAll() {
        return this.components;
    }

    /**
     * 레지스트리 초기화
     */
    clear() {
        this.components.clear();
        this.activeComponents.clear();
        this.listeners.clear();
    }
}

// 싱글톤 인스턴스 생성
const componentRegistry = new ComponentRegistry();

export default componentRegistry;
